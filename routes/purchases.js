// routes/purchases.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapPurchase(p) {
  return { id: p.id, fecha: p.fecha, proveedor: p.proveedor, producto: p.producto, cantidad: p.cantidad, costoUnit: p.costo_unit };
}

function money2(n){ return '$' + Number(n).toFixed(2); }

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM purchases ORDER BY fecha DESC, created_at DESC');
    res.json(result.rows.map(mapPurchase));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { fecha, proveedor, producto, cantidad, costoUnit } = req.body;

    const result = await db.query(
      'INSERT INTO purchases (fecha, proveedor, producto, cantidad, costo_unit) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [fecha, proveedor, producto, cantidad, costoUnit]
    );

    const prodResult = await db.query('SELECT * FROM products WHERE name = $1', [producto]);
    if (prodResult.rows.length > 0) {
      const prod = prodResult.rows[0];
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [cantidad, prod.id]);
      await db.query(
        'INSERT INTO inventory_log (fecha, producto, movimiento) VALUES ($1,$2,$3)',
        [fecha, producto, `+${cantidad} unidades (compra a ${proveedor})`]
      );
    }

    res.status(201).json(mapPurchase(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const existingResult = await db.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada.' });
    const existing = existingResult.rows[0];

    const fecha = req.body.fecha ?? existing.fecha;
    const proveedor = req.body.proveedor ?? existing.proveedor;
    const producto = req.body.producto ?? existing.producto;
    const cantidad = req.body.cantidad ?? existing.cantidad;
    const costoUnit = req.body.costoUnit ?? existing.costo_unit;

    const oldProdResult = await db.query('SELECT * FROM products WHERE name = $1', [existing.producto]);
    if (oldProdResult.rows.length > 0) {
      const oldProd = oldProdResult.rows[0];
      await db.query('UPDATE products SET stock = MAX(0, stock - $1) WHERE id = $2', [existing.cantidad, oldProd.id]);
    }

    const newProdResult = await db.query('SELECT * FROM products WHERE name = $1', [producto]);
    if (newProdResult.rows.length > 0) {
      const newProd = newProdResult.rows[0];
      await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [cantidad, newProd.id]);
    }

    await db.query(
      'UPDATE purchases SET fecha=$1, proveedor=$2, producto=$3, cantidad=$4, costo_unit=$5 WHERE id=$6',
      [fecha, proveedor, producto, cantidad, costoUnit, req.params.id]
    );

    await db.query(
      'INSERT INTO inventory_log (fecha, producto, movimiento) VALUES ($1,$2,$3)',
      [fecha, producto, `Compra editada: ahora ${cantidad} unidades a ${money2(costoUnit)} c/u (${proveedor})`]
    );

    const updated = await db.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);
    res.json(mapPurchase(updated.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existingResult = await db.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada.' });
    const existing = existingResult.rows[0];

    const prodResult = await db.query('SELECT * FROM products WHERE name = $1', [existing.producto]);
    if (prodResult.rows.length > 0) {
      const prod = prodResult.rows[0];
      await db.query('UPDATE products SET stock = MAX(0, stock - $1) WHERE id = $2', [existing.cantidad, prod.id]);
      await db.query(
        'INSERT INTO inventory_log (fecha, producto, movimiento) VALUES ($1,$2,$3)',
        [new Date().toISOString().slice(0, 10), existing.producto, `-${existing.cantidad} unidades (compra eliminada del historial)`]
      );
    }

    await db.query('DELETE FROM purchases WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;