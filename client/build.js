import { exec } from "child_process";
import fs from "fs";
import path from "path";

let idClient = "67f8e13939a13380a9077793";
if (!idClient) {
    console.error("Erreur: Aucun ID Client fourni !");
    process.exit(1);
}

const outputDir = path.join("windows", idClient);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const buildCommand = `electron-builder --win --x64 --config.directories.output=${outputDir}`;
console.log(`Lancement du build pour l'utilisateur ${idClient}...`);
exec(buildCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`Erreur de build: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Erreur STDERR: ${stderr}`);
        return;
    }
    console.log("Build terminé avec succès !");
    console.log(`Les fichiers sont dans: ${outputDir}`);
});
