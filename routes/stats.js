// routes/stats.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/finanzas', requireAdmin, (req, res) => {
  const invertido = db.prepare('SELECT COALESCE(SUM(cantidad * costo_unit),0) AS t FROM purchases').get().t;
  const vendido = db.prepare(`SELECT COALESCE(SUM(total),0) AS t FROM orders WHERE estado != 'cancelado'`).get().t;

  // ganancia aproximada por producto: (precio_venta - costo_unit_promedio) * unidades vendidas
  const items = db.prepare(`
    SELECT oi.name, oi.price, oi.qty FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.estado != 'cancelado'
  `).all();

  const gananciaPorProducto = {};
  items.forEach(it => {
    const purchase = db.prepare('SELECT costo_unit FROM purchases WHERE producto = ? ORDER BY created_at DESC LIMIT 1').get(it.name);
    const costoUnit = purchase ? purchase.costo_unit : it.price * 0.55;
    const ganancia = (it.price - costoUnit) * it.qty;
    gananciaPorProducto[it.name] = (gananciaPorProducto[it.name] || 0) + ganancia;
  });

  res.json({
    totalInvertido: invertido,
    totalVendido: vendido,
    gananciaNeta: vendido - invertido,
    gananciaPorProducto,
  });
});

router.get('/estadisticas', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT oi.name, SUM(oi.qty) AS unidades FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.estado != 'cancelado'
    GROUP BY oi.name ORDER BY unidades DESC
  `).all();
  const stockBajo = db.prepare('SELECT name, stock FROM products WHERE stock <= 5').all();
  res.json({ ventasPorProducto: rows, stockBajo });
});

router.get('/dashboard', requireAdmin, (req, res) => {
  const invertido = db.prepare('SELECT COALESCE(SUM(cantidad * costo_unit),0) AS t FROM purchases').get().t;
  const vendido = db.prepare(`SELECT COALESCE(SUM(total),0) AS t FROM orders WHERE estado != 'cancelado'`).get().t;
  const stockBajo = db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock > 0 AND stock <= 5').get().c;
  const ultimosPedidos = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 6').all();
  const productosPocoStock = db.prepare('SELECT name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC').all();
  res.json({
    totalInvertido: invertido,
    totalVendido: vendido,
    gananciaNeta: vendido - invertido,
    stockBajoCount: stockBajo,
    ultimosPedidos,
    productosPocoStock,
  });
});

module.exports = router;
