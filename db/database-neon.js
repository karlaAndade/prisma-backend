const pool = require('./neon');

async function createTables() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price DECIMAL NOT NULL,
      old_price DECIMAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      is_new INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      texto TEXT DEFAULT '',
      imagen TEXT DEFAULT '',
      activa INTEGER DEFAULT 1,
      product_id INTEGER REFERENCES products(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      fecha TEXT NOT NULL,
      proveedor TEXT NOT NULL,
      producto TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      costo_unit DECIMAL NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      fecha TEXT NOT NULL,
      total DECIMAL NOT NULL,
      estado TEXT DEFAULT 'recibido',
      nota TEXT DEFAULT '',
      cliente_nombre TEXT DEFAULT '',
      cliente_telefono TEXT DEFAULT '',
      cliente_direccion TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      name TEXT NOT NULL,
      price DECIMAL NOT NULL,
      qty INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_log (
      id SERIAL PRIMARY KEY,
      fecha TEXT NOT NULL,
      producto TEXT NOT NULL,
      movimiento TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log('✅ Tablas creadas correctamente en Neon');
}

createTables()
  .then(() => pool.end())
  .catch(err => {
    console.error('❌ Error creando tablas:', err);
    pool.end();
  });