import crypto from "crypto";
import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
// import { accessibleRecordsPlugin } from '@casl/mongoose'

const utilisateurSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
    },
    prenom: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "email est requis!"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "email non valide"],
    },
    photo: {
      type: String,
      default: "/default.png",
    },
    tel: {
      type: String,
    },
    adresse: {
      type: String,
    },
    // 1: admin
    // 2: superviseur
    //3: client
    role: {
      type: Number,
      default: 2,
    },
    password: {
      type: String,
      required: [true, "Mot de passe requis!"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Confirmation mot de passe requis!"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Mot de passe non identique!",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    // 0: non active
    // 1: active
    active: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

utilisateurSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});
utilisateurSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

utilisateurSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

utilisateurSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

utilisateurSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  // console.log({ resetToken }, this.passwordResetToken);

  // Extraire la valeur numérique et l'unité de temps (s, m, h, d)
  const duration = parseInt(process.env.JWT_RESET_PASSWORD_EXPIRES_IN);
  const unit = process.env.JWT_RESET_PASSWORD_EXPIRES_IN.slice(-1);
  // Convertir en millisecondes
  let expiresInMilliseconds;

  switch (unit) {
    case "s": // secondes
      expiresInMilliseconds = duration * 1000;
      break;
    case "m": // minutes
      expiresInMilliseconds = duration * 60 * 1000;
      break;
    case "h": // heures
      expiresInMilliseconds = duration * 60 * 60 * 1000;
      break;
    case "d": // jours
      expiresInMilliseconds = duration * 24 * 60 * 60 * 1000;
      break;
    default:
      throw new Error(
        "Unité de temps non supportée pour JWT_RESET_PASSWORD_EXPIRES_IN"
      );
  }

  // Calcul de l'expiration
  this.passwordResetExpires = Date.now() + expiresInMilliseconds;

  return resetToken;
};

// utilisateurSchema.plugin(accessibleRecordsPlugin)
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);

export default Utilisateur;
