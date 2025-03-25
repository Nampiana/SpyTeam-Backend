import Utilisateur from "../models/utilisateurModel.js";


const checkAdminRole = (req, res, next) => {
    if (req.user && req.user.role === 1) {
      next();
    } else {
        return res.status(403).json({
            error: "Accès refusé : privilèges d'administrateur requis.",
          });
    }
};

const checkSuperviseurRole = (req, res, next) => {
    if (req.user && req.user.role === 2) {
      next();
    } else {
        return res.status(403).json({
            error: "Accès refusé : droits de Superviseur requis.",
          });
    }
};


const checkAdminOrSuperviseurRole = (req, res, next) => {
  if (req.user && (req.user.role === 1 || req.user.role === 2)) {
      next();
  } else {
    return res.status(403).json({
        error: "Accès refusé : seuls les gestionnaires ou Superviseur sont autorisés.",
      });
  }
};

export default {
    checkAdminRole,
    checkSuperviseurRole,
    checkAdminOrSuperviseurRole
  };