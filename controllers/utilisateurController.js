import Utilisateur from "../models/utilisateurModel.js";
import factory from "./handelFactory.js";
import catchAsync from "../utils/catchAsync.js";
import path from "path";
import { fileURLToPath } from "url";

const createUtilisateur = factory.createOne(Utilisateur);
const getAllUtilisateurs = factory.getAll(Utilisateur);
const getUtilisateur = factory.getOne(Utilisateur);
const updateUtilisateur = factory.updateOne(Utilisateur);

const updatePDP = async (req, res) => {
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/${req.file.filename}`;
  }

  const dataUsers = {
    photo: imageUrl,
  };

  const newUsers = await Utilisateur.findOneAndUpdate(
    { _id: req.params.id },
    dataUsers,
    { new: true }
  );

  return res.status(201).json(newUsers);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const getImage = async (req, res) => {
  try {
    // console.log("Je te test");
    
    const { filename } = req.params;
    const imagePath = path.join(
      __dirname,
      "..",
      "files",
      "images",
      "utilisateur",
      filename
    );
    if (fs.existsSync(filePath)) {
      res.sendFile(imagePath);
    } else {
      console.log("Image non trouvée");
      res.status(404).json({ error: "Image non trouvée" });
    }
  } catch (error) {
    // console.log("File not found");
    res.status(404).send('File not found');
  }
};

export default {
  getAllUtilisateurs,
  getUtilisateur,
  createUtilisateur,
  updateUtilisateur,
  updatePDP,
  getImage,
};
