// routes/categories.js
const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener categorías
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT name FROM categories ORDER BY name'
    );

    res.json(result.rows.map(r => r.name));

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Crear categoría
router.post('/', requireAdmin, async (req, res) => {

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      error: 'Falta el nombre de la categoría.'
    });
  }

  try {

    await db.query(
      'INSERT INTO categories(name) VALUES($1)',
      [name]
    );

    res.status(201).json({
      ok: true
    });

  } catch (error) {

    res.status(400).json({
      error: 'Esa categoría ya existe.'
    });

  }

});

// Editar categoría
router.put('/:name', requireAdmin, async (req, res) => {

  const { newName } = req.body;

  if (!newName) {
    return res.status(400).json({
      error: 'Falta el nuevo nombre.'
    });
  }

  try {

    const existe = await db.query(
      'SELECT * FROM categories WHERE name=$1',
      [req.params.name]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({
        error: 'Categoría no encontrada.'
      });
    }

    await db.query(
      'UPDATE categories SET name=$1 WHERE name=$2',
      [newName, req.params.name]
    );

    await db.query(
      'UPDATE products SET category=$1 WHERE category=$2',
      [newName, req.params.name]
    );

    res.json({
      ok: true
    });

  } catch (error) {

    res.status(400).json({
      error: 'Ya existe una categoría con ese nombre.'
    });

  }

});

// Eliminar categoría
router.delete('/:name', requireAdmin, async (req, res) => {

  try {

    await db.query(
      'DELETE FROM categories WHERE name=$1',
      [req.params.name]
    );

    res.json({
      ok: true
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

module.exports = router;