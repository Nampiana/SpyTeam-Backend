import mongoose from "mongoose";

const configurationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Utilisateur',
    unique: true
  },
  fpsVideo: { type: String, default: "25" },
  qualiteVideo: { type: String, default: "6000k" },
  fpsImage: { type: String, default: "fps=1/1" },
  qualiteImage: { type: String, default: "10" },
  timeout: { type: String, default: "5000" },

});

const Configuration = mongoose.model("Configuration", configurationSchema);
export default Configuration;
