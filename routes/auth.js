const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Faltan usuario o contraseña.'
      });
    }

    const result = await db.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos.'
      });
    }

    const admin = result.rows[0];

    const valid = bcrypt.compareSync(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos.'
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      token,
      username: admin.username
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error interno del servidor.'
    });
  }
});

module.exports = router;