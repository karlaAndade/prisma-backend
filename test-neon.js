require('dotenv').config();
const pool = require('./db/neon');

async function probar() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa con Neon');
    console.log(result.rows);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  } finally {
    await pool.end();
  }
}

probar();