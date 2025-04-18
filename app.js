import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import AppError from "./utils/appError.js";
import globalErrorHandler from "./controllers/errorController.js";
import authRouter from "./routes/utilisateurRoutes.js";
import utilisateurRouter from "./routes/utilisateurRoutes.js";
import Utilisateur from "./models/utilisateurModel.js";
import configurationRouter from "./routes/configRoutes.js";
import { connectWithRetryMongo } from "./db/authenticationDb.js";
import morgan from "morgan";
import bodyParser from "body-parser";
import dns from "dns";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
//import { createProxyMiddleware } from "http-proxy-middleware";
connectWithRetryMongo();

const app = express();
app.use((req, res, next) => {
  req.io = req.app.get('io'); // on lira io depuis l'app (voir plus bas)
  next();
});
app.use(cors());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const captureDir = path.join(__dirname, "capture");
app.use("/capture", express.static(captureDir));
app.disable("x-powered-by");
app.use(bodyParser.json());

// Définir les règles pour les proxies
app.set("trust proxy", (ip) => {
  return ["127.0.0.1", "::ffff:172.24.0.5"].includes(ip);
});

// Configurer CORS
app.options("*", cors());

// Configurer les middlewares de base
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Middleware Helmet pour la sécurité
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// Logger pour le développement
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limiter le nombre de requêtes par IP
const limiter = rateLimit({
  max: 5000,
  windowMs: 2 * 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Ajouter le temps de la requête à chaque requête
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

function isVideoValid(filePath) {
  return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err || !metadata || !metadata.format || metadata.format.duration === 0) {
              resolve(false); // Non lisible
          } else {
              resolve(true); // Lisible
          }
      });
  });
}

app.get("/capture/:userId/:date", async (req, res) => {
  const { userId, date } = req.params;
  const captureDir = path.join(__dirname, "capture", userId, date);

  if (!fs.existsSync(captureDir)) {
      return res.json([]);
  }

  const files = fs.readdirSync(captureDir);
  const videoFiles = files.filter(file => file.endsWith(".mp4"));

  const validVideos = [];

  for (const file of videoFiles) {
      const filePath = path.join(captureDir, file);
      const stats = fs.statSync(filePath);

      if (stats.size > 0) {
          const valid = await isVideoValid(filePath);
          if (valid) {
              validVideos.push(file);
          }
      }
  }

  res.json(validVideos);
});

app.get("/download/:clientId", (req, res) => {
  const clientId = req.params.clientId;

  // Chemin complet vers le fichier .exe
  const exePath = path.join(__dirname, "client", "windows", clientId, "SpyTeam Setup 1.0.0.exe");

  console.log("Chemin du fichier .exe :", exePath);
  

  // Vérifie si le fichier existe
  if (fs.existsSync(exePath)) {
    res.download(exePath, "SpyTeam Setup 1.0.0.exe", (err) => {
      if (err) {
        console.error("Erreur de téléchargement :", err);
        res.status(500).send("Erreur lors du téléchargement du fichier.");
      }
    });
  } else {
    res.status(404).send("Fichier introuvable pour ce client.");
  }
});

// Configurer les fichiers statiques

// Routes de l'application
const baseRoute = "/api/v1";

app.get(`${baseRoute}/build-status`, async (req, res) => {
  try {
    const buildingUser = await Utilisateur.findOne({ buildStatus: 'building' });
    res.json({ isBuilding: !!buildingUser });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.use(`${baseRoute}/auth`, authRouter);
app.use(`${baseRoute}/utilisateur`, utilisateurRouter);
app.use(`${baseRoute}/configuration`, configurationRouter);

// Gestion des requêtes mal formées
app.all("*", (req, res, next) => {
  // if (req.originalUrl.startsWith("/static")) {
  //   return res.status(404).send("Resource not found");
  // }
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Gestion globale des erreurs
app.use(globalErrorHandler);

export default app;
