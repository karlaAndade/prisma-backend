// routes/inventory.js

const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();


// Obtener historial de movimientos de inventario
router.get('/log', requireAdmin, async (req, res) => {

  try {

    const result = await db.query(
      `
      SELECT *
      FROM inventory_log
      ORDER BY created_at DESC
      LIMIT 100
      `
    );


    res.json(
      result.rows.map(r => ({
        fecha: r.fecha,
        producto: r.producto,
        mov: r.movimiento
      }))
    );


  } catch(error) {

    res.status(500).json({
      error: error.message
    });

  }

});


module.exports = router;