import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import express from "express";
import fs from "fs";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import Utilisateur from "./models/utilisateurModel.js";
import cron from "cron";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.on("uncaughtException", (err) => {
  process.exit(1);
});

dotenv.config({ path: "config.env" });

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(cors());

const clientStreams = {};

io.on("connection", (socket) => {
  console.log("🟢 Serveur de réception connecté, enregistrement en cours...");

  socket.on("sendVideo", (data) => {
    console.log(`📡 Client ${data.client} envoie une vidéo...`);
    const OUTPUT_DIR = `./capture/${data.client}/${data.dateFolder}`;

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const filename = `${OUTPUT_DIR}/${data.fileName}`;

    if (!clientStreams[filename]) {
      clientStreams[filename] = fs.createWriteStream(filename, { flags: "a" });
    }

    const fileStream = clientStreams[filename];

    socket.on("video", (chunk) => {
      if (chunk.data) {
        if (Buffer.isBuffer(chunk.data)) {
          fileStream.write(chunk.data);
          const base64Image = chunk.data.toString("base64");
          const mimeType = "image/jpeg";
          const dataUrl = `data:${mimeType};base64,${base64Image}`;
        } else {
          console.error("⚠️ Erreur : chunk.data n'est pas un Buffer");
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Client ${data.client} déconnecté, fichier fermé: ${filename}`);
    });
  });

  socket.on("test", (data) => {
    io.emit("videoStream", {
      image: data.data,
      clientId: data.client,
    });
  });
});

const port = process.env.PORT || 4000;

const server = httpServer.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  server.close(() => {
  });
});

function zipFolder(folderPath, archivePath) {
  const folderName = path.basename(folderPath);
  const parentDir = path.dirname(folderPath);

  const zip = spawn("zip", ["-r", archivePath, folderName], {
    cwd: parentDir, // <-- Très important
  });

  zip.stdout.on("data", (data) => {
    console.log(`zip stdout: ${data}`);
  });

  zip.stderr.on("data", (data) => {
    console.error(`zip stderr: ${data}`);
  });

  zip.on("close", (code) => {
    if (code === 0) {
      console.log(`✅ Compression terminée: ${archivePath}`);
    } else {
      console.error(`❌ Compression échouée (code ${code}): ${folderPath}`);
    }
  });
}


const fsPromises = fs.promises;

async function deleteCompressedFolders() {
  try {
    const baseDir = path.join(__dirname, "capture");
    const utilisateurs = await Utilisateur.find().lean();

    if (!utilisateurs.length) {
      console.log("❌ Aucun utilisateur trouvé !");
      return;
    }

    const users = await fsPromises.readdir(baseDir); // Lecture du dossier baseDir
    for (const userId of users) {
      const userPath = path.join(baseDir, userId);

      try {
        const folders = await fsPromises.readdir(userPath); // Lecture des sous-dossiers pour chaque utilisateur
        for (const folderName of folders) {
          const folderPath = path.join(userPath, folderName);
          const archivePath = folderPath + ".zip";

          const stats = await fsPromises.lstat(folderPath);
          if (stats.isDirectory()) {
            if (fs.existsSync(archivePath)) {
              await fsPromises.rm(folderPath, { recursive: true, force: true }); // Suppression du dossier
              console.log(`🗑️ Dossier supprimé: ${folderPath}`);
            } else {
              console.log(`⚠️ Archive non trouvée pour: ${folderPath}`);
            }
          }
        }
      } catch (err) {
        console.error(`❌ Erreur lecture des dossiers pour l'utilisateur ${userId}:`, err);
      }
    }
  } catch (err) {
    console.error("❌ Erreur récupération utilisateurs:", err);
  }
}
// deleteCompressedFolders();

const deleteMonthly = new cron.CronJob("0 0 1 * *", () => {
  console.log("🗓️ Tâche de suppression mensuelle lancée !");
  deleteCompressedFolders();
});

// deleteMonthly.start();

async function testCompressFromDB() {
  try {
    const utilisateurs = await Utilisateur.find().lean();

    if (!utilisateurs.length) {
      console.log("❌ Aucun utilisateur trouvé !");
      return;
    }

    utilisateurs.forEach((utilisateur) => {
      const userId = utilisateur._id.toString();
      const userPath = path.join(__dirname, "capture", userId);

      if (!fs.existsSync(userPath)) {
        console.log(`📂 Dossier manquant pour l'utilisateur ${userId}`);
        return;
      }

      console.log(`📂 Dossier trouvé pour l'utilisateur ${userId}: ${userPath}`);

      fs.readdir(userPath, (err, folders) => {
        if (err) return console.error(`Erreur lecture du dossier ${userId}:`, err);
        console.log(`📂 Dossiers trouvés pour l'utilisateur ${userId}:`, folders);

        folders.forEach((folderName) => {
          const folderPath = path.join(userPath, folderName);
          const archivePath = folderPath + ".zip";
          console.log(`📂 Dossier à compresser: ${folderPath}`);
          console.log(`📦 Chemin de l'archive: ${archivePath}`);

          if (!fs.existsSync(archivePath)) {
            zipFolder(folderPath, archivePath);
          } else {
            console.log(`📦 Déjà compressé: ${archivePath}`);
          }
        });
      });
    });
  } catch (err) {
    console.error("❌ Erreur récupération utilisateurs:", err);
  }
}
// testCompressFromDB();

const compressWeekly = new cron.CronJob("0 0 * * 0", () => {
  console.log("⏱️ Tâche de compression hebdomadaire lancée !");
  testCompressFromDB();
});
// compressWeekly.start();