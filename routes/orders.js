// routes/orders.js
const express = require('express');
const db = require('../db/database-sqlite');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapOrder(o) {
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  return {
    id: o.id,
    fecha: o.fecha,
    total: o.total,
    estado: o.estado,
    nota: o.nota,
    cliente: { nombre: o.cliente_nombre, telefono: o.cliente_telefono, direccion: o.cliente_direccion },
    items: items.map(i => ({ id: i.product_id, name: i.name, price: i.price, qty: i.qty })),
  };
}

// POST /api/orders -> crear pedido (público, se llama al enviar el carrito)
router.post('/', (req, res) => {
  const { items, nota, cliente } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'El pedido no tiene productos.' });

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const fecha = new Date().toISOString().slice(0, 10);

  const insertOrder = db.prepare(`INSERT INTO orders (fecha, total, estado, nota, cliente_nombre, cliente_telefono, cliente_direccion)
    VALUES (?, ?, 'recibido', ?, ?, ?, ?)`);
  const info = insertOrder.run(fecha, total, nota || '', cliente?.nombre || '', cliente?.telefono || '', cliente?.direccion || '');

  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
  const logMove = db.prepare('INSERT INTO inventory_log (fecha, producto, movimiento) VALUES (?, ?, ?)');

  items.forEach(i => {
    insertItem.run(info.lastInsertRowid, i.id, i.name, i.price, i.qty);
    if (i.id) {
      updateStock.run(i.qty, i.id);
      logMove.run(fecha, i.name, `-${i.qty} unidad(es) (venta, pedido #${info.lastInsertRowid})`);
    }
  });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapOrder(order));
});

// GET /api/orders -> listado (admin)
router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows.map(mapOrder));
});

// PATCH /api/orders/:id/estado -> cambiar estado (admin)
router.patch('/:id/estado', requireAdmin, (req, res) => {
  const { estado } = req.body;
  const valid = ['recibido', 'entregado', 'cancelado'];
  if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  db.prepare('UPDATE orders SET estado = ? WHERE id = ?').run(estado, req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  res.json(mapOrder(order));
});

module.exports = router;
