const generateFileName = (idClient) => {
    const date = new Date();

    const dateString = date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    // Remplace les "/" (dans la date) et ":" (dans l'heure) par "-"
    // Remplace aussi l'espace entre la date et l'heure par "_"
    const formattedDate = dateString.replace(/\//g, "-").replace(/:/g, "-").replace(" ", "_");

    const fileName = `capture_${formattedDate}_${idClient}.mp4`;
    return fileName;
};

const generateDate = () => {
    const date = new Date();

    const dateString = date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const folderName = dateString.replace(/\//g, "-");
    return folderName;
};

export default {
    generateFileName,
    generateDate
  };