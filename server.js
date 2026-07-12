// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// si la base de datos aún no existe, la crea y la siembra con datos iniciales
const dbFile = path.join(__dirname, 'prisma.db');
const isFirstRun = !fs.existsSync(dbFile);
require('./db/database'); // crea las tablas
if (isFirstRun) {
  console.log('🌱 Primera vez que se ejecuta: sembrando datos iniciales...');
  require('./db/seed');
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/config', require('./routes/config'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/stats', require('./routes/stats'));

// cualquier ruta que no sea /api sirve el sitio (index.html)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌈 Prisma corriendo en http://localhost:${PORT}`);
  console.log(`   Panel admin: http://localhost:${PORT}/#admin\n`);
});
