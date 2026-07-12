// db/seed.js
// Siembra datos iniciales: usuario admin, categorías, productos de ejemplo,
// promociones y configuración del negocio. Se ejecuta una sola vez
// automáticamente si la base de datos está vacía (ver server.js),
// o manualmente con: npm run seed

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
  if (adminCount === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'prisma2026', 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
      .run(process.env.ADMIN_USER || 'admin', hash);
    console.log('✓ Usuario administrador creado');
  }

  const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
  if (catCount === 0) {
    const cats = ['Accesorios', 'Bolsos', 'Joyería', 'Hogar & Decor', 'Papelería', 'Tecnología'];
    const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    cats.forEach(c => insertCat.run(c));
    console.log('✓ Categorías creadas');
  }

  const prodCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  if (prodCount === 0) {
    const products = [
      ['Lentes de sol Horizonte', 'Accesorios', 28.00, 0, 14, 1, 1, 0, 'Lentes de sol con montura liviana y protección UV400. Ideales para uso diario.', 'https://picsum.photos/seed/prisma-sun/800/800'],
      ['Bolso tejido Aurora', 'Bolsos', 42.50, 52.00, 6, 1, 1, 0, 'Bolso artesanal de fibra natural, tejido a mano. Piezas limitadas.', 'https://picsum.photos/seed/prisma-bag/800/800'],
      ['Anillo Espiral Cobre', 'Joyería', 15.00, 0, 20, 1, 0, 1, 'Anillo ajustable en cobre pulido, diseño en espiral.', 'https://picsum.photos/seed/prisma-ring/800/800'],
      ['Vela aromática Nébula', 'Hogar & Decor', 12.00, 0, 3, 1, 0, 1, 'Vela de cera de soya con notas de sándalo y vainilla. 40 horas de combustión.', 'https://picsum.photos/seed/prisma-candle/800/800'],
      ['Libreta Espectro A5', 'Papelería', 9.50, 0, 0, 1, 0, 0, 'Libreta tapa dura con hojas punteadas, 120 páginas.', 'https://picsum.photos/seed/prisma-notebook/800/800'],
      ['Audífonos Onda Bluetooth', 'Tecnología', 34.90, 39.90, 9, 1, 1, 0, 'Audífonos inalámbricos, cancelación de ruido pasiva, 20h de batería.', 'https://picsum.photos/seed/prisma-headphones/800/800'],
      ['Collar Prisma Fino', 'Joyería', 19.90, 0, 11, 1, 0, 1, 'Collar en acero inoxidable bañado en oro, dije geométrico.', 'https://picsum.photos/seed/prisma-necklace/800/800'],
      ['Mochila Urbana Flux', 'Bolsos', 55.00, 0, 5, 1, 0, 0, 'Mochila impermeable con compartimento acolchado para laptop 15".', 'https://picsum.photos/seed/prisma-backpack/800/800'],
    ];
    const insertProd = db.prepare(`INSERT INTO products
      (name, category, price, old_price, stock, active, featured, is_new, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    products.forEach(p => insertProd.run(...p));
    console.log('✓ Productos de ejemplo creados (reemplázalos desde el panel admin)');
  }

  const promoCount = db.prepare('SELECT COUNT(*) AS c FROM promotions').get().c;
  if (promoCount === 0) {
    const promos = [
      ['descuento', '20% OFF en audífonos', 'Solo esta semana en toda la línea de tecnología', 'https://picsum.photos/seed/prisma-promo1/900/700', 1],
      ['combo', 'Combo Joyería: anillo + collar', 'Llevá los dos por $30 y ahorrá $4.90', 'https://picsum.photos/seed/prisma-promo2/900/700', 1],
      ['destacado', 'Nueva colección Aurora', 'Bolsos tejidos a mano, piezas limitadas', 'https://picsum.photos/seed/prisma-promo3/900/700', 1],
    ];
    const insertPromo = db.prepare('INSERT INTO promotions (tipo, titulo, texto, imagen, activa) VALUES (?, ?, ?, ?, ?)');
    promos.forEach(p => insertPromo.run(...p));
    console.log('✓ Promociones de ejemplo creadas');
  }

  const purchaseCount = db.prepare('SELECT COUNT(*) AS c FROM purchases').get().c;
  if (purchaseCount === 0) {
    const purchases = [
      ['2026-07-01', 'Artesanías del Valle', 'Bolso tejido Aurora', 10, 22.00],
      ['2026-07-03', 'TecnoImport EC', 'Audífonos Onda Bluetooth', 15, 18.50],
    ];
    const insertPurchase = db.prepare('INSERT INTO purchases (fecha, proveedor, producto, cantidad, costo_unit) VALUES (?, ?, ?, ?, ?)');
    purchases.forEach(p => insertPurchase.run(...p));
    console.log('✓ Compras de ejemplo creadas');
  }

  const configCount = db.prepare('SELECT COUNT(*) AS c FROM config').get().c;
  if (configCount === 0) {
    const config = {
      businessName: 'Prisma',
      whatsapp: process.env.WHATSAPP_NUMBER || '593963146192',
      address: 'Quito, Ecuador',
      hours: 'Lun a Sáb · 9:00 - 19:00',
      instagram: '@prisma.ec',
      facebook: 'Prisma',
    };
    const insertCfg = db.prepare('INSERT INTO config (key, value) VALUES (?, ?)');
    Object.entries(config).forEach(([k, v]) => insertCfg.run(k, v));
    console.log('✓ Configuración inicial creada');
  }

  console.log('\n🌈 Base de datos de Prisma lista.');
}

seed();
module.exports = seed;
