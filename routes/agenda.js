import express from "express";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Mock temporal en memoria
let AGENDA = [];

// GET: listar citas
router.get("/", auth, async (req, res) => {
  res.json({ ok: true, agenda: AGENDA });
});

// POST: crear cita
router.post("/", auth, async (req, res) => {
  const newCita = {
    id: Date.now().toString(),
    paciente: req.body.paciente,
    fecha: req.body.fecha,
    hora: req.body.hora,
    motivo: req.body.motivo || "",
  };

  AGENDA.push(newCita);

  res.json({ ok: true, cita: newCita });
});

// PUT: editar cita
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const idx = AGENDA.findIndex((c) => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, msg: "Cita no encontrada" });
  }

  AGENDA[idx] = {
    ...AGENDA[idx],
    ...req.body,
  };

  res.json({ ok: true, cita: AGENDA[idx] });
});

export default router;
