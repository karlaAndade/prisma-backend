// routes/inventory.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/log', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM inventory_log ORDER BY created_at DESC LIMIT 100').all();
  res.json(rows.map(r => ({ fecha: r.fecha, producto: r.producto, mov: r.movimiento })));
});

module.exports = router;
