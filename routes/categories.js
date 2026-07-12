// routes/categories.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT name FROM categories ORDER BY name').all();
  res.json(rows.map(r => r.name));
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Falta el nombre de la categoría.' });
  try {
    db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
  } catch (e) {
    return res.status(400).json({ error: 'Esa categoría ya existe.' });
  }
  res.status(201).json({ ok: true });
});

router.put('/:name', requireAdmin, (req, res) => {
  const { newName } = req.body;
  if (!newName) return res.status(400).json({ error: 'Falta el nuevo nombre.' });
  const exists = db.prepare('SELECT * FROM categories WHERE name = ?').get(req.params.name);
  if (!exists) return res.status(404).json({ error: 'Categoría no encontrada.' });
  try {
    db.prepare('UPDATE categories SET name = ? WHERE name = ?').run(newName, req.params.name);
    db.prepare('UPDATE products SET category = ? WHERE category = ?').run(newName, req.params.name);
  } catch (e) {
    return res.status(400).json({ error: 'Ya existe una categoría con ese nombre.' });
  }
  res.json({ ok: true });
});

router.delete('/:name', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM categories WHERE name = ?').run(req.params.name);
  res.json({ ok: true });
});

module.exports = router;
