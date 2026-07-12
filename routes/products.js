// routes/products.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    oldPrice: p.old_price,
    stock: p.stock,
    active: !!p.active,
    featured: !!p.featured,
    isNew: !!p.is_new,
    description: p.description,
    images: [p.image_url],
  };
}

// GET /api/products -> lista pública (solo activos) o todos si es admin (?all=1, requiere token)
router.get('/', (req, res, next) => {
  if (req.query.all) return requireAdmin(req, res, next);
  next();
}, (req, res) => {
  const rows = req.query.all
    ? db.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
    : db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC').all();
  res.json(rows.map(mapProduct));
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json(mapProduct(p));
});

router.post('/', requireAdmin, (req, res) => {
  const { name, category, price, oldPrice, stock, description, images, active, featured, isNew } = req.body;
  const info = db.prepare(`INSERT INTO products
    (name, category, price, old_price, stock, active, featured, is_new, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(name, category, price || 0, oldPrice || 0, stock || 0, active ? 1 : 0, featured ? 1 : 0, isNew ? 1 : 0, description || '', (images && images[0]) || '');
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapProduct(p));
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name, category, price, oldPrice, stock, description, images, active, featured, isNew } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado.' });

  db.prepare(`UPDATE products SET name=?, category=?, price=?, old_price=?, stock=?, active=?, featured=?, is_new=?, description=?, image_url=? WHERE id=?`)
    .run(
      name ?? existing.name,
      category ?? existing.category,
      price ?? existing.price,
      oldPrice ?? existing.old_price,
      stock ?? existing.stock,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      isNew !== undefined ? (isNew ? 1 : 0) : existing.is_new,
      description ?? existing.description,
      (images && images[0]) || existing.image_url,
      req.params.id
    );
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(mapProduct(p));
});

router.patch('/:id/stock', requireAdmin, (req, res) => {
  const { delta } = req.body; // +1 o -1
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado.' });
  const newStock = Math.max(0, p.stock + delta);
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, req.params.id);
  db.prepare('INSERT INTO inventory_log (fecha, producto, movimiento) VALUES (?, ?, ?)')
    .run(new Date().toISOString().slice(0,10), p.name, `${delta > 0 ? '+' : ''}${delta} unidad (ajuste manual)`);
  res.json(mapProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
