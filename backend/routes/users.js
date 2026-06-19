const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne, run } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/workers — público (para selector de barbero en reservas)
router.get('/workers', (req, res) => {
  res.json(query(
    `SELECT id, name, initials, email, active FROM users WHERE role='trabajador' ORDER BY id`
  ));
});

// GET /api/users/workers/all — admin: incluye inactivos
router.get('/workers/all', requireAdmin, (req, res) => {
  res.json(query(
    `SELECT id, name, initials, email, active FROM users WHERE role='trabajador' ORDER BY id`
  ));
});

// POST /api/users/workers — admin: crear barbero
router.post('/workers', requireAdmin, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email y password requeridos' });

  const exists = queryOne('SELECT id FROM users WHERE email=?', [email.toLowerCase().trim()]);
  if (exists) return res.status(409).json({ error: 'Ese email ya está registrado' });

  const initials = name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  const hash = bcrypt.hashSync(password, 10);

  const id = run(
    `INSERT INTO users(name,initials,email,password,role) VALUES(?,?,?,?,'trabajador')`,
    [name.trim(), initials, email.toLowerCase().trim(), hash]
  );
  res.status(201).json(queryOne('SELECT id,name,initials,email,active FROM users WHERE id=?', [id]));
});

// PATCH /api/users/workers/:id — admin: editar (nombre/email/password/active)
router.patch('/workers/:id', requireAdmin, (req, res) => {
  const w = queryOne(`SELECT * FROM users WHERE id=? AND role='trabajador'`, [req.params.id]);
  if (!w) return res.status(404).json({ error: 'No encontrado' });

  const { name, email, password, active } = req.body;
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name=?', 'initials=?');
    params.push(name.trim(), name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase());
  }
  if (email) { updates.push('email=?'); params.push(email.toLowerCase().trim()); }
  if (password) { updates.push('password=?'); params.push(bcrypt.hashSync(password, 10)); }
  if (active !== undefined) { updates.push('active=?'); params.push(active ? 1 : 0); }

  if (!updates.length) return res.status(400).json({ error: 'Nada para actualizar' });

  params.push(req.params.id);
  run(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);
  res.json(queryOne('SELECT id,name,initials,email,active FROM users WHERE id=?', [req.params.id]));
});

// DELETE /api/users/workers/:id — admin
router.delete('/workers/:id', requireAdmin, (req, res) => {
  const w = queryOne(`SELECT id FROM users WHERE id=? AND role='trabajador'`, [req.params.id]);
  if (!w) return res.status(404).json({ error: 'No encontrado' });
  run('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
