import jwt from "jsonwebtoken";
import Utilisateur from "../models/utilisateurModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import crypto from "crypto";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const signTokenSalarie = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN_SALARIER,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  let token = signToken(user._id);
  if(user.role===3){
    token = signTokenSalarie(user._id);
  }
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      res.status(400).json({
        status: "error",
        message: "Veuillez entrer un email et un mot de passe!",
      })
    );
  }
  const user = await Utilisateur.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    res
      .status(401)
      .json({ status: "error", message: "Email ou mot de passe incorrecte!" });
  }

  if (user.active === 0) {
    return res.status(403).json({
      status: "error",
      message:
        "Votre compte est désactivé. Veuillez contacter l'administrateur.",
    });
  }

  createSendToken(user, 200, req, res);
});

let tokenBlacklist = [];
const logout = (req, res) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (token) {
    tokenBlacklist.push(token);
  }
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res
    .status(200)
    .json({ status: "success", message: "Utilisateur déconnecté" });
};

const protect = catchAsync(async (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Aucun token fourni." });
  }

  if (tokenBlacklist.includes(token)) {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Utilisateur.findById(decodedToken.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalide." });
  }
});

const protectModifInfo = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Accès refusé. Aucun token fourni." });
  }

  if (tokenBlacklist.includes(token)) {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedToken;

    const utilisateur = await Utilisateur.findById(decodedToken.id);
    if (!utilisateur) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    const targetUserId = req.params.id || req.body.userId;
    console.log("UserId in request:", targetUserId);
    console.log("Decoded User ID:", decodedToken.id);

    if (targetUserId && targetUserId !== decodedToken.id) {
      if (utilisateur.role !== 1) {
        return res.status(403).json({
          error: "Accès interdit. Vous ne pouvez pas modifier les informations d'un autre utilisateur."
        });
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalide." });
  }
});




const sendEmailResetPassword = catchAsync(async (req, res, next) => {
  const email = req.body.email;
  const user = await Utilisateur.findOne({ email: req.body.email });

  if (user) {
    // if (user.passwordChangedAt) {
    //   const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
    //   const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

    //   if (passwordChangedTime > twoDaysAgo) {
    //     return res.status(400).json({
    //       status: "error",
    //       error: null,
    //       message: "Le mot de passe a déjà été modifié il y a moins de 2 jours.",
    //     });
    //   }
    // }

    const resetToken = await user.createPasswordResetToken();
    if (resetToken) {
      await Utilisateur.updateOne({ _id: user._id }, user);

      const nomUtilisateur = user.prenom + " " + user.nom;
      await sendEmail.sendReset("Mot de passe oublié", 3, user.email, nomUtilisateur, user.passwordResetToken, user.email,  next);

      res.status(201).json({
        status: "success",
        error: null,
        message:
          "Un e-mail vous a été envoyé. Veuillez consulter votre boîte de réception. Merci!",
      });
    }
  } else {
    res.status(401).json({
      status: "error",
      error: null,
      message:
        "Vous n'êtes pas autorisé à faire cette action car vous n'êtes pas membre de cette application.",
    });
  }
});

const resetPassword = async (req, res, next) => {
  try {
    const user = await Utilisateur.findOne({
      email: req.query.email,
      passwordResetToken: req.query.token,
     // passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(404).json({
        error: "La session a été expiré!",
      });
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, req, res);
  } catch (error) {
    res.status(404).json({
      error: error,
    });
  }
};

const updatePassword = catchAsync(async (req, res, next) => {
  const { ability } = req;

  const user = await Utilisateur.findOne({ _id: req.params.id }).select(
    "+password"
  );

  if (!user) {
    return res.status(404).json({
      error:
        "Aucun document n’a été trouvé sur vous ou bien vous n’êtes pas autorisé!",
    });
  }

  // i  

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    res.status(401).json({ error: "Votre mot de passe actuel est erroné." });
  }

  if (req.body.password == !req.body.passwordConfirm) {
    res.status(401).json({
      error: "Le mot de passe que vous avez saisis n'est pas conforme.",
    });
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordChangedAt = Date.now();
  await user.save();
  const nomUtilisateur = user.prenom + " " + user.nom;
 // const message = bodyMail(2, null, null, null, nomUtilisateur);
  await sendEmail.sends("Modification mot de passe", 2, user.email, nomUtilisateur, next);
  createSendToken(user, 200, req, res);
});

const checkToken = catchAsync(async (req, res, next) => {
  // Le middleware protect a déjà vérifié le token et attaché l'utilisateur à req.user
  const user = await Utilisateur.findById(req.user.id).select('-password');
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});


export default {
  login,
  logout,
  protect,
  protectModifInfo,
  updatePassword,
  resetPassword,
  sendEmailResetPassword,
  checkToken,
};
