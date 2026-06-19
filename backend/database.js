const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'db');
const DB_PATH = path.join(DB_DIR, 'barbercut.db.json');

// Crea la carpeta db/ si no existe (ej. primer arranque o repo recién clonado)
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;
let SQL = null;

async function getDB() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const saved = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const buf = Buffer.from(saved.data);
    db = new SQL.Database(buf);
    migrate();
  } else {
    db = new SQL.Database();
    createSchema();
    seedData();
    persist();
  }
  return db;
}

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, JSON.stringify({ data: Array.from(data) }));
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      initials  TEXT    NOT NULL,
      email     TEXT    NOT NULL UNIQUE,
      password  TEXT    NOT NULL,
      role      TEXT    NOT NULL CHECK(role IN ('admin','trabajador')),
      active    INTEGER NOT NULL DEFAULT 1,
      created_at TEXT   DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      sku             TEXT    UNIQUE,
      name            TEXT    NOT NULL,
      duration        INTEGER NOT NULL,
      price           INTEGER NOT NULL,
      costo_unitario  INTEGER DEFAULT 0,
      unidades_vendidas INTEGER DEFAULT 0,
      active          INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT    NOT NULL,
      service_id  INTEGER NOT NULL REFERENCES services(id),
      worker_id   INTEGER NOT NULL REFERENCES users(id),
      date        TEXT    NOT NULL,
      time        TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'confirmada'
                          CHECK(status IN ('confirmada','completada','cancelada')),
      rating      INTEGER CHECK(rating BETWEEN 1 AND 5),
      amount      INTEGER NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_worker_date ON bookings(worker_id, date);
    CREATE INDEX IF NOT EXISTS idx_bookings_date        ON bookings(date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
  `);
}

// Agrega columnas nuevas a bases ya existentes sin perder datos
function migrate() {
  const cols = query(`PRAGMA table_info(services)`).map(c => c.name);
  if (!cols.includes('sku'))
    db.run(`ALTER TABLE services ADD COLUMN sku TEXT`);
  if (!cols.includes('costo_unitario'))
    db.run(`ALTER TABLE services ADD COLUMN costo_unitario INTEGER DEFAULT 0`);
  if (!cols.includes('unidades_vendidas'))
    db.run(`ALTER TABLE services ADD COLUMN unidades_vendidas INTEGER DEFAULT 0`);
  persist();
}

function seedData() {
  const bcrypt = require('bcryptjs');
  const hash = p => bcrypt.hashSync(p, 10);

  db.run(`INSERT INTO users(name,initials,email,password,role) VALUES(?,?,?,?,?)`,
    ['Andrés Admin','AA','admin@barbercut.cl', hash('admin123'), 'admin']);

  [
    ['Andrés Mora',  'AM', 'andres@barbercut.cl', hash('1234')],
    ['Miguel Reyes', 'MR', 'miguel@barbercut.cl', hash('1234')],
    ['Carlos Vega',  'CV', 'carlos@barbercut.cl', hash('1234')],
  ].forEach(r => db.run(
    `INSERT INTO users(name,initials,email,password,role) VALUES(?,?,?,?,?)`,
    [...r, 'trabajador']
  ));

  [
    ['Corte Clásico',   30, 12000],
    ['Corte + Barba',   60, 18000],
    ['Degradado Fade',  45, 15000],
    ['Ritual Completo', 90, 25000],
    ['Barba Perfilada', 30, 10000],
  ].forEach(r => db.run(
    `INSERT INTO services(name,duration,price) VALUES(?,?,?)`, r));

  const bookings = [
    ['Diego Muñoz',    1, 2, '2026-06-17', '10:30', 'completada', 5,  18000],
    ['Matías Rojas',   2, 3, '2026-06-17', '11:00', 'completada', 5,  12000],
    ['Sebastián Vera', 3, 4, '2026-06-16', '14:00', 'completada', 5,  25000],
    ['Felipe Araya',   4, 2, '2026-06-16', '15:30', 'completada', 4,  15000],
    ['Tomás Castillo', 5, 3, '2026-06-15', '11:30', 'completada', 5,  18000],
    ['Ignacio Bravo',  6, 4, '2026-06-15', '10:00', 'completada', 5,  15000],
    ['Pablo Soto',     7, 2, '2026-06-18', '10:00', 'confirmada', null,12000],
    ['Luis Pérez',     8, 3, '2026-06-18', '11:00', 'confirmada', null,10000],
    ['Juan Flores',    9, 4, '2026-06-18', '14:00', 'confirmada', null,18000],
    ['Ricardo López', 10, 2, '2026-06-19', '09:00', 'confirmada', null,25000],
    ['Marco Jiménez', 11, 3, '2026-06-19', '15:00', 'confirmada', null,15000],
    ['Andrés Torres', 12, 4, '2026-06-20', '10:30', 'confirmada', null,12000],
  ];
  bookings.forEach(([client, svcId, wId, date, time, status, rating, amount]) => {
    db.run(
      `INSERT INTO bookings(client_name,service_id,worker_id,date,time,status,rating,amount)
       VALUES(?,?,?,?,?,?,?,?)`,
      [client, svcId, wId, date, time, status, rating, amount]
    );
  });
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
  const r = queryOne('SELECT last_insert_rowid() as id');
  return r ? r.id : null;
}

module.exports = { getDB, query, queryOne, run, persist };