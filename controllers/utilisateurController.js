import Utilisateur from "../models/utilisateurModel.js";
import factory from "./handelFactory.js";
import catchAsync from "../utils/catchAsync.js";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs";

const buildElectronApp = (idClient) => {

  console.log("Lancement du build pour l'utilisateur:", idClient); // Ajout du log

  const filePath = path.join("G:", "BPO_concept", "Spyteam", "SpyTeam_Backend", "client", "main.js");

  // Lire le fichier et remplacer l'ID du client
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Erreur de lecture du fichier:", err);
      return;
    }

    const newData = data.replace(/let idClient = ".*?";/, `let idClient = "${idClient}";`);

    fs.writeFile(filePath, newData, "utf8", (err) => {
      if (err) {
        console.error("Erreur d'écriture du fichier:", err);
        return;
      }

      console.log("ID Client mis à jour. Lancement du build...");

      // Lancer le build Electron dans le dossier client
      exec(`npm run build`, { cwd: "G:/BPO_concept/Spyteam/SpyTeam_Backend/client" }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur de build: ${error.message}`);
            console.error(`Code d'erreur: ${error.code}`);
            console.error(`Signal: ${error.signal}`);
            return;
        }else {
          console.log("Build Electron lancé avec succès !");
        }
    
        if (stderr) {
            console.error(`Erreur STDERR: ${stderr}`);
            return;
        }
    
        console.log(`STDOUT: ${stdout}`);
        console.log("Build terminé avec succès !");
    });
    });
  });
};

// Dans ton endpoint de création d'utilisateur
const createUtilisateur = async (req, res, next) => {
  try {

    console.log("Données reçues:", req.body);
    // Utiliser factory.createOne mais récupérer la réponse directement depuis la base de données
    const utilisateur = await Utilisateur.create(req.body);

    if (!utilisateur) {
      return res.status(500).json({ success: false, error: "Erreur de création de l'utilisateur" });
    }

    // Lancer le build après création
    buildElectronApp(utilisateur._id.toString());

    res.status(201).json({ success: true, data: utilisateur });
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

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
