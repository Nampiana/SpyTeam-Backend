import mongoose from "mongoose";

const configurationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Utilisateur',
    unique: true
  },
  resolution: { type: String, default: "1280x720" },
  fpsVideo: { type: String, default: "25" },
  qualiteVideo: { type: String, default: "6000k" },
  fpsImage: { type: String, default: "fps=1/1" },
  qualiteImage: { type: String, default: "10" },

});

const Configuration = mongoose.model("Configuration", configurationSchema);
export default Configuration;
