import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Cargar dataset completo en memoria (solo una vez)
const cie10Path = path.resolve("data/cie10.json");
const cie10 = JSON.parse(fs.readFileSync(cie10Path, "utf8"));

/* ---------------------------------------
   BUSCAR CIE-10 POR TEXTO
---------------------------------------- */
router.get("/", async (req, res) => {
  const query = req.query.query?.toString().toLowerCase() || "";

  if (query.length < 2) {
    return res.json([]);
  }

  // Filtrar resultados
  const results = cie10
    .filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
    )
    .slice(0, 20); // limitar a 20 resultados

  res.json(results);
});

export default router;

