require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDB } = require('./database');

const app = express();

// Permite tu frontend en GitHub Pages + localhost para desarrollo.
// Reemplaza FRONTEND_URL en tus variables de entorno de Render con tu URL real,
// ej: https://tu-usuario.github.io
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // en modo abierto por simplicidad; restringe si lo necesitas
  }
}));
app.use(express.json({ limit: '5mb' })); // CSV puede traer varias filas

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => res.json({ ok: true, service: 'BarberCut API' }));

const PORT = process.env.PORT || 3000;

async function start() {
  await getDB();
  console.log('Base de datos lista (sql.js)');
  app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
}

start();