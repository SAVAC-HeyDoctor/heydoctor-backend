const express = require('express');

const router = express.Router();

/**
 * GET /pacientes
 * Comprueba que el router esté montado en server.js.
 */
router.get('/', async (req, res) => {
  res.json({ ok: true, message: 'Pacientes endpoint funcionando' });
});

module.exports = router;
