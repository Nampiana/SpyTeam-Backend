import express from "express";
import configController from '../controllers/configController.js';

const router = express.Router();

router.post("/config", configController.upsertConfig);
router.get("/config/:userId", configController.getConfig); 

export default router;
