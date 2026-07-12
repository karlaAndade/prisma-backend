// routes/config.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM config').all();
  const cfg = {};
  rows.forEach(r => cfg[r.key] = r.value);
  res.json(cfg);
});

router.put('/', requireAdmin, (req, res) => {
  const upsert = db.prepare(`INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  Object.entries(req.body).forEach(([k, v]) => upsert.run(k, String(v)));
  const rows = db.prepare('SELECT * FROM config').all();
  const cfg = {};
  rows.forEach(r => cfg[r.key] = r.value);
  res.json(cfg);
});

module.exports = router;
