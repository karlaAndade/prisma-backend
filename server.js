// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
    // Solo en tu compu: inicializa SQLite y siembra datos si es la primera vez
    const dbFile = path.join(__dirname, 'prisma.db');
    const isFirstRun = !fs.existsSync(dbFile);

    require('./db/database-sqlite');

    if (isFirstRun) {
        console.log('🌱 Primera ejecución...');
        require('./db/seed');
    }
}

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌈 Prisma corriendo en http://localhost:${PORT}`);
    console.log(`Panel Admin: http://localhost:${PORT}/#admin`);
});