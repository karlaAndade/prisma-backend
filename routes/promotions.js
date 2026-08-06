// routes/promotions.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin, checkAdminIfAll } = require('../middleware/auth');

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

// Obtener promociones
router.get('/', async (req, res) => {
  if (!checkAdminIfAll(req, res)) return;

  try {
    const sql = req.query.all
      ? 'SELECT * FROM promotions ORDER BY created_at DESC'
      : 'SELECT * FROM promotions WHERE activa = 1 ORDER BY created_at DESC';

    const result = await db.query(sql);
    res.json(result.rows.map(mapPromo));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear promoción
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { tipo, titulo, texto, imagen, activa, productId } = req.body;

    const result = await db.query(
      `INSERT INTO promotions
      (tipo,titulo,texto,imagen,activa,product_id)
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        tipo || 'descuento',
        titulo || 'Nueva promoción',
        texto || '',
        imagen || '',
        activa === false ? 0 : 1,
        productId || null
      ]
    );

    res.status(201).json(mapPromo(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar promoción
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const actual = await db.query('SELECT * FROM promotions WHERE id=$1', [req.params.id]);
    if (actual.rows.length === 0)
      return res.status(404).json({ error: 'Promoción no encontrada.' });

    const p = actual.rows[0];

    const result = await db.query(
      `UPDATE promotions SET
      tipo=$1, titulo=$2, texto=$3, imagen=$4, activa=$5, product_id=$6
      WHERE id=$7
      RETURNING *`,
      [
        req.body.tipo ?? p.tipo,
        req.body.titulo ?? p.titulo,
        req.body.texto ?? p.texto,
        req.body.imagen ?? p.imagen,
        req.body.activa !== undefined ? (req.body.activa ? 1 : 0) : p.activa,
        req.body.productId !== undefined ? req.body.productId : p.product_id,
        req.params.id
      ]
    );

    res.json(mapPromo(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activar/desactivar promoción
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const promo = await db.query('SELECT * FROM promotions WHERE id=$1', [req.params.id]);
    if (promo.rows.length === 0)
      return res.status(404).json({ error: 'Promoción no encontrada.' });

    const result = await db.query(
      'UPDATE promotions SET activa=$1 WHERE id=$2 RETURNING *',
      [promo.rows[0].activa ? 0 : 1, req.params.id]
    );

    res.json(mapPromo(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar promoción
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM promotions WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;