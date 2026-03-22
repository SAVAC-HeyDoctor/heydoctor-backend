/**
 * Backend Express HeyDoctor (Node.js).
 * Ejecutar: node server.js  (desde esta carpeta `backend/`)
 * Puerto por defecto: 8080
 */
require('dotenv').config();

const express = require('express');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pacientesRoutes = require('./routes/pacientes');
app.use('/pacientes', pacientesRoutes);

// 404 coherente con el error que veías si faltaba la ruta
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Escuchando en http://localhost:${PORT}`);
  console.log(`[Express] Prueba: GET http://localhost:${PORT}/pacientes`);
});
