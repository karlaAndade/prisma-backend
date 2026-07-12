// routes/promotions.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapPromo(p) {
  return {
    id: p.id,
    tipo: p.tipo,
    titulo: p.titulo,
    texto: p.texto,
    imagen: p.imagen,
    activa: !!p.activa,
    productId: p.product_id || null,
  };
}

router.get('/', (req, res, next) => {
  if (req.query.all) return requireAdmin(req, res, next);
  next();
}, (req, res) => {
  const rows = req.query.all
    ? db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM promotions WHERE activa = 1 ORDER BY created_at DESC').all();
  res.json(rows.map(mapPromo));
});

router.post('/', requireAdmin, (req, res) => {
  const { tipo, titulo, texto, imagen, activa, productId } = req.body;
  const info = db.prepare('INSERT INTO promotions (tipo, titulo, texto, imagen, activa, product_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tipo || 'descuento', titulo || 'Nueva promoción', texto || '', imagen || '', activa === false ? 0 : 1, productId || null);
  res.status(201).json(mapPromo(db.prepare('SELECT * FROM promotions WHERE id = ?').get(info.lastInsertRowid)));
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM promotions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Promoción no encontrada.' });
  const { tipo, titulo, texto, imagen, activa, productId } = req.body;
  db.prepare('UPDATE promotions SET tipo=?, titulo=?, texto=?, imagen=?, activa=?, product_id=? WHERE id=?')
    .run(
      tipo ?? existing.tipo,
      titulo ?? existing.titulo,
      texto ?? existing.texto,
      imagen ?? existing.imagen,
      activa !== undefined ? (activa ? 1 : 0) : existing.activa,
      productId !== undefined ? (productId || null) : existing.product_id,
      req.params.id
    );
  res.json(mapPromo(db.prepare('SELECT * FROM promotions WHERE id = ?').get(req.params.id)));
});

router.patch('/:id/toggle', requireAdmin, (req, res) => {
  const p = db.prepare('SELECT * FROM promotions WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Promoción no encontrada.' });
  db.prepare('UPDATE promotions SET activa = ? WHERE id = ?').run(p.activa ? 0 : 1, req.params.id);
  res.json(mapPromo(db.prepare('SELECT * FROM promotions WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM promotions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
