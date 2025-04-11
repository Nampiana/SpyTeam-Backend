import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import express from "express";
import fs from "fs";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";

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

app.set('io', io);

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
