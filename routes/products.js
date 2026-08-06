const express = require('express');
const db = require('../db/database');
const { requireAdmin, checkAdminIfAll } = require('../middleware/auth');

const router = express.Router();

function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    oldPrice: Number(p.old_price),
    stock: p.stock,
    active: !!p.active,
    featured: !!p.featured,
    isNew: !!p.is_new,
    description: p.description,
    images: [p.image_url],
  };
}

// Obtener productos
router.get('/', async (req, res) => {
  if (!checkAdminIfAll(req, res)) return;

  try {
    const sql = req.query.all
      ? 'SELECT * FROM products ORDER BY created_at DESC'
      : 'SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC';

    const result = await db.query(sql);
    res.json(result.rows.map(mapProduct));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear producto
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name, category, price, oldPrice, stock,
      description, images, active, featured, isNew
    } = req.body;

    const result = await db.query(
      `INSERT INTO products
      (name,category,price,old_price,stock,active,featured,is_new,description,image_url)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        name,
        category,
        price || 0,
        oldPrice || 0,
        stock || 0,
        active ? 1 : 0,
        featured ? 1 : 0,
        isNew ? 1 : 0,
        description || '',
        (images && images[0]) || ''
      ]
    );

    res.status(201).json(mapProduct(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar producto
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE products SET
      name=$1, category=$2, price=$3, old_price=$4, stock=$5,
      active=$6, featured=$7, is_new=$8, description=$9, image_url=$10
      WHERE id=$11
      RETURNING *`,
      [
        req.body.name,
        req.body.category,
        req.body.price,
        req.body.oldPrice,
        req.body.stock,
        req.body.active ? 1 : 0,
        req.body.featured ? 1 : 0,
        req.body.isNew ? 1 : 0,
        req.body.description || '',
        (req.body.images && req.body.images[0]) || '',
        req.params.id
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Producto no encontrado' });

    res.json(mapProduct(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar stock
router.patch('/:id/stock', requireAdmin, async (req, res) => {
  try {
    const { delta } = req.body;

    const producto = await db.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (producto.rows.length === 0)
      return res.status(404).json({ error: 'Producto no encontrado' });

    const p = producto.rows[0];
    const nuevoStock = Math.max(0, p.stock + delta);

    await db.query('UPDATE products SET stock=$1 WHERE id=$2', [nuevoStock, req.params.id]);

    await db.query(
      `INSERT INTO inventory_log (fecha,producto,movimiento) VALUES($1,$2,$3)`,
      [new Date().toISOString().slice(0, 10), p.name, `${delta > 0 ? '+' : ''}${delta} unidad`]
    );

    const actualizado = await db.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    res.json(mapProduct(actualizado.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;