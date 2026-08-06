require('dotenv').config();
const pool = require('./db/neon');

async function probar() {
  try {
    console.log('🔄 Probando conexión con Neon...');

    const result = await pool.query('SELECT NOW()');

    console.log('✅ Conexión exitosa con Neon');
    console.log('Hora del servidor:', result.rows[0]);

  } catch (error) {
    console.log('❌ Error de conexión con Neon');
    console.log(error);
  } finally {
    await pool.end();
  }
}

probar();