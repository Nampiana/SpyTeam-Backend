import express from 'express';
import authController from '../controllers/authController.js'
import utilisateurController from '../controllers/utilisateurController.js'
import upload from '../utils/uploadFile.js';
import checkRole from '../middleware/checkRole.js';

const router = express.Router();
router.get('/me', authController.protect, authController.checkToken);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/password/resetPassword', authController.sendEmailResetPassword);
router.post('/password/change/resetPassword', authController.resetPassword);
router.get('/image/:filename', utilisateurController.getImage);
router.use(authController.protect);
router.route('/').get(checkRole.checkAdminOrSuperviseurRole, utilisateurController.getAllUtilisateurs).post(checkRole.checkAdminRole, utilisateurController.createUtilisateur);
router.route('/:id').get(utilisateurController.getUtilisateur).put(authController.protectModifInfo, utilisateurController.updateUtilisateur);
router.patch('/updateMyPassword/:id', authController.updatePassword);
router.patch('/update/profil/:id', upload.handleSingleFileUpload, utilisateurController.updatePDP);


export default router;