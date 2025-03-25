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
import { connectWithRetryMongo } from "./db/authenticationDb.js";
import morgan from "morgan";
import bodyParser from "body-parser";
import dns from "dns";
//import { createProxyMiddleware } from "http-proxy-middleware";
connectWithRetryMongo();

const app = express();
app.disable("x-powered-by");
app.use(bodyParser.json());

// Définir les règles pour les proxies
app.set("trust proxy", (ip) => {
  return ["127.0.0.1", "::ffff:172.24.0.5"].includes(ip);
});

// Configurer CORS
app.use(
  cors({
    origin: ["https://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);
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
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Ajouter le temps de la requête à chaque requête
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Configurer les fichiers statiques
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Routes de l'application
const baseRoute = "/api/v1";
app.use(`${baseRoute}/auth`, authRouter);
app.use(`${baseRoute}/utilisateur`, utilisateurRouter);

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
