import express from "express";
import { listar, actualizar } from "../controllers/auditoriaController.js";

const router = express.Router();

router.get("/list", listar);
router.post("/list", listar);
router.post("/update", actualizar);

export default router;
