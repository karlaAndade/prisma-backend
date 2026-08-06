// routes/config.js

const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();


// Obtener configuración
router.get('/', async (req, res) => {

  try {

    const result = await db.query(
      'SELECT * FROM config'
    );


    const cfg = {};

    result.rows.forEach(r => {
      cfg[r.key] = r.value;
    });


    res.json(cfg);


  } catch(error) {

    res.status(500).json({
      error: error.message
    });

  }

});



// Actualizar configuración
router.put('/', requireAdmin, async (req, res) => {

  try {


    for (const [key, value] of Object.entries(req.body)) {


      await db.query(
      `
      INSERT INTO config(key,value)
      VALUES($1,$2)
      ON CONFLICT(key)
      DO UPDATE SET value = EXCLUDED.value
      `,
      [
        key,
        String(value)
      ]
      );


    }



    const result = await db.query(
      'SELECT * FROM config'
    );


    const cfg = {};

    result.rows.forEach(r => {
      cfg[r.key] = r.value;
    });


    res.json(cfg);



  } catch(error) {


    res.status(500).json({
      error:error.message
    });


  }


});


module.exports = router;