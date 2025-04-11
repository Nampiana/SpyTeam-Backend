import Utilisateur from "../models/utilisateurModel.js";
import Configuration from "../models/configuration.js";
import factory from "./handelFactory.js";
import catchAsync from "../utils/catchAsync.js";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs";
import { spawn } from "child_process";

const buildElectronApp = async (req, res) => {
  try {
    console.log(req.body);

    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, error: "clientId est requis" });
    }
    // Modification du fichier build.js avec l'ID client
    const filePathBuildJs = path.join("G:", "BPO_concept", "Spyteam", "SpyTeam_Backend", "client", "build.js");
    fs.readFile(filePathBuildJs, "utf8", (err, data) => {
      if (err) {
        console.error("Erreur de lecture du fichier:", err);
        return res.status(500).json({ success: false, error: "Erreur de lecture du fichier" });
      }
      const newData = data.replace(/let idClient = ".*?";/, `let idClient = "${clientId}";`);

      fs.writeFile(filePathBuildJs, newData, "utf8", (err) => {
        if (err) {
          console.error("Erreur d'écriture du fichier:", err);
          return res.status(500).json({ success: false, error: "Erreur d'écriture du fichier build.js" });
        }
      });
    });

    // Modification du fichier main.js avec l'ID client
    const filePath = path.join("G:", "BPO_concept", "Spyteam", "SpyTeam_Backend", "client", "main.js");
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Erreur de lecture du fichier:", err);
        return res.status(500).json({ success: false, error: "Erreur de lecture du fichier" });
      }

      // Remplacement de l'ID client dans le fichier
      const newData = data.replace(/let idClient = ".*?";/, `let idClient = "${clientId}";`);

      fs.writeFile(filePath, newData, "utf8", (err) => {
        if (err) {
          console.error("Erreur d'écriture du fichier:", err);
          return res.status(500).json({ success: false, error: "Erreur d'écriture du fichier" });
        }

        console.log("ID Client mis à jour. Lancement du build...");

        const buildProcess = spawn("npm", ["run", "build"], {
          cwd: "G:/BPO_concept/Spyteam/SpyTeam_Backend/client",
          shell: true
        });

        buildProcess.stdout.on("data", (data) => {
          console.log(`STDOUT: ${data}`);
        });

        buildProcess.stderr.on("data", (data) => {
          console.error(`STDERR: ${data}`);
        });

        buildProcess.on("close", async (code) => {
          if (code === 0) {
            console.log(`✅ Build terminé avec succès pour l'utilisateur ${clientId} !`);
        
            try {
              // Mise à jour du champ buildStatus
              await Utilisateur.findByIdAndUpdate(clientId, { buildStatus: "done" });
              console.log(`🔄 Statut de build mis à jour pour l'utilisateur ${clientId}`);
            } catch (updateError) {
              console.error("❌ Erreur lors de la mise à jour du statut de build:", updateError);
            }
        
            return res.status(200).json({ success: true, message: "Build terminé avec succès" });
          } else {
            console.error(`❌ Erreur de build avec le code: ${code}`);
            return res.status(500).json({ success: false, error: `Erreur de build: code ${code}` });
          }
        });
      });
    });
  } catch (error) {
    console.error("Erreur dans buildElectronApp:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


/*const createUtilisateur = async (req, res, next) => {
  try {
    console.log("Données reçues:", req.body);

    // Création de l'utilisateur
    const utilisateur = await Utilisateur.create(req.body);

    if (!utilisateur) {
      return res.status(500).json({ success: false, error: "Erreur de création de l'utilisateur" });
    }

    // Appel direct de buildElectronApp avec un objet req simulé
    await buildElectronApp({ body: { idClient: utilisateur._id.toString() } }, res);

    res.status(201).json({ success: true, data: utilisateur });
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};*/

const createUtilisateur = catchAsync(async (req, res, next) => {
  // Créer l'utilisateur
  const utilisateur = await Utilisateur.create(req.body);

  await Configuration.create({
    userId: utilisateur._id,
  });

  res.status(201).json({
    status: "success",
    data: utilisateur.toJSON({ virtuals: true }),
  });
});


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
  buildElectronApp
};
