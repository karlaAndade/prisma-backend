// routes/purchases.js
const express = require('express');
const db = require('../db/database-sqlite');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapPurchase(p) {
  return { id: p.id, fecha: p.fecha, proveedor: p.proveedor, producto: p.producto, cantidad: p.cantidad, costoUnit: p.costo_unit };
}

router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM purchases ORDER BY fecha DESC, created_at DESC').all();
  res.json(rows.map(mapPurchase));
});

router.post('/', requireAdmin, (req, res) => {
  const { fecha, proveedor, producto, cantidad, costoUnit } = req.body;
  const info = db.prepare('INSERT INTO purchases (fecha, proveedor, producto, cantidad, costo_unit) VALUES (?, ?, ?, ?, ?)')
    .run(fecha, proveedor, producto, cantidad, costoUnit);

  // aumenta el stock del producto automáticamente y registra en inventario
  const prod = db.prepare('SELECT * FROM products WHERE name = ?').get(producto);
  if (prod) {
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(cantidad, prod.id);
    db.prepare('INSERT INTO inventory_log (fecha, producto, movimiento) VALUES (?, ?, ?)')
      .run(fecha, producto, `+${cantidad} unidades (compra a ${proveedor})`);
  }

  res.status(201).json(mapPurchase(db.prepare('SELECT * FROM purchases WHERE id = ?').get(info.lastInsertRowid)));
});

// PUT /api/purchases/:id -> editar una compra existente, ajustando el stock por la diferencia
router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Compra no encontrada.' });

  const fecha = req.body.fecha ?? existing.fecha;
  const proveedor = req.body.proveedor ?? existing.proveedor;
  const producto = req.body.producto ?? existing.producto;
  const cantidad = req.body.cantidad ?? existing.cantidad;
  const costoUnit = req.body.costoUnit ?? existing.costo_unit;

  // revierte el efecto de la compra anterior en el producto anterior
  const oldProd = db.prepare('SELECT * FROM products WHERE name = ?').get(existing.producto);
  if (oldProd) db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(existing.cantidad, oldProd.id);

  // aplica el nuevo efecto sobre el producto (puede ser el mismo u otro distinto)
  const newProd = db.prepare('SELECT * FROM products WHERE name = ?').get(producto);
  if (newProd) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(cantidad, newProd.id);

  db.prepare('UPDATE purchases SET fecha=?, proveedor=?, producto=?, cantidad=?, costo_unit=? WHERE id=?')
    .run(fecha, proveedor, producto, cantidad, costoUnit, req.params.id);

  db.prepare('INSERT INTO inventory_log (fecha, producto, movimiento) VALUES (?, ?, ?)')
    .run(fecha, producto, `Compra editada: ahora ${cantidad} unidades a ${money2(costoUnit)} c/u (${proveedor})`);

  res.json(mapPurchase(db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id)));
});

// DELETE /api/purchases/:id -> elimina la compra y revierte el stock que había sumado
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM purchases WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Compra no encontrada.' });

  const prod = db.prepare('SELECT * FROM products WHERE name = ?').get(existing.producto);
  if (prod) {
    db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(existing.cantidad, prod.id);
    db.prepare('INSERT INTO inventory_log (fecha, producto, movimiento) VALUES (?, ?, ?)')
      .run(new Date().toISOString().slice(0,10), existing.producto, `-${existing.cantidad} unidades (compra eliminada del historial)`);
  }

  db.prepare('DELETE FROM purchases WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function money2(n){ return '$' + Number(n).toFixed(2); }

module.exports = router;
