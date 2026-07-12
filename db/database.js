// db/database.js
// Inicializa la base de datos SQLite y crea las tablas si no existen.
// Un solo archivo (prisma.db) guarda TODO el negocio: productos, ventas,
// compras, inventario, clientes, promociones y configuración.
//
// Usa el módulo SQLite incorporado en Node.js (node:sqlite) en vez de una
// librería externa como better-sqlite3. Esto evita por completo los
// problemas de compilación nativa en Windows/Mac/Linux: no hace falta
// instalar Visual Studio Build Tools ni nada parecido. Requiere Node.js
// 22.5 o superior (a partir de Node 22.13 / 23.4 ya no hace falta ninguna
// bandera especial).

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'prisma.db');
const db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true });
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  old_price REAL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  is_new INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  texto TEXT DEFAULT '',
  imagen TEXT DEFAULT '',
  activa INTEGER NOT NULL DEFAULT 1,
  product_id INTEGER REFERENCES products(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  costo_unit REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  total REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'recibido',
  nota TEXT DEFAULT '',
  cliente_nombre TEXT DEFAULT '',
  cliente_telefono TEXT DEFAULT '',
  cliente_direccion TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  producto TEXT NOT NULL,
  movimiento TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Migración segura: si la base de datos ya existía de una versión anterior
// (sin la columna product_id en promotions), la agrega sin borrar nada.
try {
  db.exec('ALTER TABLE promotions ADD COLUMN product_id INTEGER REFERENCES products(id)');
} catch (e) {
  // la columna ya existe, no hay nada que hacer
}

module.exports = db;
