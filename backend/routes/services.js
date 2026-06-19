const express = require('express');
const { query, queryOne, run } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/services — público (catálogo para reservas)
router.get('/', (req, res) => {
  const onlyActive = req.query.all !== '1';
  const sql = onlyActive
    ? 'SELECT * FROM services WHERE active=1 ORDER BY id'
    : 'SELECT * FROM services ORDER BY id';
  res.json(query(sql));
});

// POST /api/services — admin: crear servicio manual
router.post('/', requireAdmin, (req, res) => {
  const { name, duration, price, sku, costo_unitario } = req.body;
  if (!name || !duration || !price)
    return res.status(400).json({ error: 'name, duration y price son requeridos' });

  const id = run(
    `INSERT INTO services(name,duration,price,sku,costo_unitario) VALUES(?,?,?,?,?)`,
    [name.trim(), duration, price, sku || null, costo_unitario || 0]
  );
  res.status(201).json(queryOne('SELECT * FROM services WHERE id=?', [id]));
});

// PATCH /api/services/:id — admin: editar
router.patch('/:id', requireAdmin, (req, res) => {
  const s = queryOne('SELECT * FROM services WHERE id=?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'No encontrado' });

  const fields = ['name','duration','price','sku','costo_unitario','active'];
  const updates = [];
  const params = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
  });
  if (!updates.length) return res.status(400).json({ error: 'Nada para actualizar' });

  params.push(req.params.id);
  run(`UPDATE services SET ${updates.join(',')} WHERE id=?`, params);
  res.json(queryOne('SELECT * FROM services WHERE id=?', [req.params.id]));
});

// DELETE /api/services/:id — admin
router.delete('/:id', requireAdmin, (req, res) => {
  const s = queryOne('SELECT id FROM services WHERE id=?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  run('DELETE FROM services WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// POST /api/services/import-csv — admin
// Body: { rows: [{sku, nombre_servicio, costo_unitario, precio_venta, barbero, unidades_vendidas}, ...] }
// El CSV puede traer varias filas por mismo sku (una por barbero). Se agrupan sumando
// unidades_vendidas; la columna "barbero" no se guarda en services (no aplica a nivel de catálogo).
// El frontend parsea el CSV con FileReader y manda el JSON ya parseado (sin libs extra).
router.post('/import-csv', requireAdmin, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || !rows.length)
    return res.status(400).json({ error: 'rows debe ser un array no vacío' });

  let errors = [];

  // Agrupa por sku: suma unidades_vendidas, conserva nombre/costo/precio de la primera fila válida
  const grouped = new Map();

  rows.forEach((r, i) => {
    const sku = String(r.sku ?? '').trim();
    const nombre = String(r.nombre_servicio ?? '').trim();
    const costo = parseInt(r.costo_unitario) || 0;
    const precio = parseInt(r.precio_venta) || 0;
    const unidades = parseInt(r.unidades_vendidas) || 0;

    if (!sku || !nombre || !precio) {
      errors.push({ row: i + 1, error: 'sku, nombre_servicio y precio_venta son requeridos' });
      return;
    }

    if (!grouped.has(sku)) {
      grouped.set(sku, { sku, nombre, costo, precio, unidades: 0 });
    }
    grouped.get(sku).unidades += unidades;
  });

  let created = 0, updated = 0;

  grouped.forEach(({ sku, nombre, costo, precio, unidades }) => {
    const existing = queryOne('SELECT id FROM services WHERE sku=?', [sku]);
    if (existing) {
      run(
        `UPDATE services SET name=?, price=?, costo_unitario=?, unidades_vendidas=? WHERE sku=?`,
        [nombre, precio, costo, unidades, sku]
      );
      updated++;
    } else {
      run(
        `INSERT INTO services(sku,name,duration,price,costo_unitario,unidades_vendidas)
         VALUES(?,?,?,?,?,?)`,
        [sku, nombre, 30, precio, costo, unidades]
      );
      created++;
    }
  });

  res.json({ ok: true, created, updated, errors });
});

module.exports = router;