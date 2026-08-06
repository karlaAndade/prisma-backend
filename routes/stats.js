// routes/stats.js

const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();


// Finanzas
router.get('/finanzas', requireAdmin, async (req, res) => {

  try {

    const invertido = await db.query(
      'SELECT COALESCE(SUM(cantidad * costo_unit),0) AS t FROM purchases'
    );


    const vendido = await db.query(
      `
      SELECT COALESCE(SUM(total),0) AS t 
      FROM orders 
      WHERE estado != 'cancelado'
      `
    );


    const items = await db.query(
      `
      SELECT oi.name, oi.price, oi.qty 
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.estado != 'cancelado'
      `
    );


    const gananciaPorProducto = {};


    for (const it of items.rows) {


      const purchase = await db.query(
        `
        SELECT costo_unit 
        FROM purchases 
        WHERE producto=$1 
        ORDER BY created_at DESC 
        LIMIT 1
        `,
        [it.name]
      );


      const costoUnit = purchase.rows.length
        ? purchase.rows[0].costo_unit
        : it.price * 0.55;


      const ganancia =
        (it.price - costoUnit) * it.qty;


      gananciaPorProducto[it.name] =
        (gananciaPorProducto[it.name] || 0) + ganancia;

    }



    res.json({

      totalInvertido: Number(invertido.rows[0].t),

      totalVendido: Number(vendido.rows[0].t),

      gananciaNeta:
        Number(vendido.rows[0].t) -
        Number(invertido.rows[0].t),

      gananciaPorProducto

    });



  } catch(error){

    res.status(500).json({
      error:error.message
    });

  }


});




// Estadísticas
router.get('/estadisticas', requireAdmin, async(req,res)=>{


try{


const rows = await db.query(
`
SELECT 
oi.name,
SUM(oi.qty) AS unidades

FROM order_items oi

JOIN orders o 
ON o.id = oi.order_id

WHERE o.estado != 'cancelado'

GROUP BY oi.name

ORDER BY unidades DESC
`
);



const stockBajo = await db.query(
`
SELECT name,stock 
FROM products
WHERE stock <= 5
`
);



res.json({

ventasPorProducto: rows.rows,

stockBajo: stockBajo.rows

});



}catch(error){

res.status(500).json({
error:error.message
});

}


});




// Dashboard
router.get('/dashboard', requireAdmin, async(req,res)=>{


try{


const invertido = await db.query(
`
SELECT COALESCE(SUM(cantidad*costo_unit),0) AS t
FROM purchases
`
);



const vendido = await db.query(
`
SELECT COALESCE(SUM(total),0) AS t
FROM orders
WHERE estado != 'cancelado'
`
);



const stockBajo = await db.query(
`
SELECT COUNT(*) AS c
FROM products
WHERE stock > 0
AND stock <= 5
`
);



const ultimosPedidos = await db.query(
`
SELECT *
FROM orders
ORDER BY created_at DESC
LIMIT 6
`
);



const productosPocoStock = await db.query(
`
SELECT name,stock
FROM products
WHERE stock <= 5
ORDER BY stock ASC
`
);



res.json({

totalInvertido:Number(invertido.rows[0].t),

totalVendido:Number(vendido.rows[0].t),

gananciaNeta:
Number(vendido.rows[0].t) -
Number(invertido.rows[0].t),

stockBajoCount:
Number(stockBajo.rows[0].c),

ultimosPedidos:
ultimosPedidos.rows,

productosPocoStock:
productosPocoStock.rows

});



}catch(error){

res.status(500).json({
error:error.message
});

}



});



module.exports = router;