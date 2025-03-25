import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destinationPath = req.storagePath || 'files/images/utilisateur/';
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const storageAudio = multer.diskStorage({
  destination: (req, file, cb) => {
    const destinationPath = req.storagePath || 'files/images/audio/';
    cb(null, destinationPath);
  },
});

const fileFilter = (req, file, cb) => {
  if (req.storagePath) {
    cb(null, true);
  } else {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Fichier non supporté, veuillez télécharger uniquement des images'), false);
    }
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

const uploadAudio = multer({ 
  storage: storageAudio,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

const handleUpload = (req, res, next) =>{
  upload.array('files',10)(req, res, (err)=>{
    if(err instanceof multer.MulterError){
      if(err.code === 'LIMIT_FILE_SIZE'){
        return res.status(400).json({
          error: "Le fichier est trop grand. Le taille maximal autorisé est 5 Mo.",
        });
      }
      return res.status(400).json({
        error: "Erreur de téléchargement du fichier.",
      });
    }else if(err){
      return res.status(400).json({
        error: "Erreur serveur lors du téléchargement du fichier.",
      });
    }
    next();
  })
}

const handleSingleFileUpload = (req, res, next) =>{
  upload.single('image')(req, res, (err)=>{
    if(err instanceof multer.MulterError){
      if(err.code === 'LIMIT_FILE_SIZE'){
        return res.status(400).json({
          error: "Le fichier est trop grand. Le taille maximal autorisé est 5 Mo.",
        });
      }
      return res.status(400).json({
        error: "Erreur de téléchargement du fichier.",
      });
    }else if(err){
      return res.status(400).json({
        error: "Erreur serveur lors du téléchargement du fichier.",
      });
    }
    next();
  })
}

export default {
  handleUpload,
  handleSingleFileUpload
};
