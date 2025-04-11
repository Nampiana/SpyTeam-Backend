import Configuration from "../models/configuration.js";

const upsertConfig = async (req, res) => {
  try {
    const { userId, resolution, fpsVideo, qualiteVideo, fpsImage, qualiteImage } = req.body;

    const config = await Configuration.findOneAndUpdate(
      { userId },
      { resolution, fpsVideo, qualiteVideo, fpsImage, qualiteImage },
      { upsert: true, new: true }
    );

    // Notifier le client Electron via WebSocket
    req.app.get('io').emit("config:update", { userId, config });
    console.log("Config mise à jour :", config);
    console.log("Clients connectés :", req.app.get('io').engine.clientsCount);



    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtenir config d'un utilisateur
 const getConfig = async (req, res) => {
  try {
    const { userId } = req.params;
    const config = await Configuration.findOne({ userId });

    if (!config) return res.status(404).json({ message: "Config not found" });

    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export default {
    upsertConfig,
    getConfig
  };