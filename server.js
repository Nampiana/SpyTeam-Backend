import http from "http";
import dotenv from "dotenv";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  // console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  // console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "config.env" });


const httpServer = http.createServer(app);

const port = process.env.PORT || 4000;

const server = httpServer.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  // console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  // console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  // console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    // console.log("💥 Process terminated!");
  });
});


