const express = require('express');
const { query, queryOne, run } = require('../database');
const { requireAuth, requireAdmin, requireWorker } = require('../middleware/auth');

const router = express.Router();

const ALL_TIMES = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30'
];

router.get('/available', (req, res) => {
  const { worker_id, date } = req.query;
  if (!worker_id || !date)
    return res.status(400).json({ error: 'worker_id y date requeridos' });

  const taken = query(
    `SELECT time FROM bookings WHERE worker_id=? AND date=? AND status != 'cancelada'`,
    [worker_id, date]
  ).map(r => r.time);

  res.json({
    date,
    worker_id: parseInt(worker_id),
    available: ALL_TIMES.filter(t => !taken.includes(t)),
    taken,
  });
});

router.get('/', requireWorker, (req, res) => {
  const { status, worker_id, date_from, date_to } = req.query;
  const isAdmin = req.user.role === 'admin';

  let sql = `
    SELECT b.*, s.name as service_name, s.duration,
           u.name as worker_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN users    u ON u.id = b.worker_id
    WHERE 1=1`;
  const params = [];

  if (!isAdmin) {
    sql += ' AND b.worker_id = ?'; params.push(req.user.id);
  } else if (worker_id) {
    sql += ' AND b.worker_id = ?'; params.push(worker_id);
  }
  if (status)    { sql += ' AND b.status = ?';    params.push(status); }
  if (date_from) { sql += ' AND b.date >= ?';     params.push(date_from); }
  if (date_to)   { sql += ' AND b.date <= ?';     params.push(date_to); }

  sql += ' ORDER BY b.date DESC, b.time DESC';

  res.json(query(sql, params));
});

// Público: feed de actividad reciente para la landing (sin auth)
router.get('/public/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  const rows = query(`
    SELECT b.client_name, b.date, b.time, b.rating, b.status,
           s.name as service_name, u.name as worker_name
    FROM bookings b
    JOIN services s ON s.id=b.service_id
    JOIN users    u ON u.id=b.worker_id
    WHERE b.status='completada'
    ORDER BY b.date DESC, b.time DESC
    LIMIT ?`, [limit]);
  res.json(rows);
});

router.get('/:id', requireWorker, (req, res) => {
  const b = queryOne(
    `SELECT b.*, s.name as service_name, s.duration, s.price,
            u.name as worker_name
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN users    u ON u.id = b.worker_id
     WHERE b.id = ?`, [req.params.id]
  );
  if (!b) return res.status(404).json({ error: 'Reserva no encontrada' });

  if (req.user.role === 'trabajador' && b.worker_id !== req.user.id)
    return res.status(403).json({ error: 'Acceso denegado' });

  res.json(b);
});

router.post('/', (req, res) => {
  const { client_name, service_id, worker_id, date, time } = req.body;
  if (!client_name || !service_id || !worker_id || !date || !time)
    return res.status(400).json({ error: 'Faltan campos requeridos' });

  const conflict = queryOne(
    `SELECT id FROM bookings WHERE worker_id=? AND date=? AND time=? AND status!='cancelada'`,
    [worker_id, date, time]
  );
  if (conflict)
    return res.status(409).json({ error: 'Este horario ya está reservado' });

  const svc = queryOne('SELECT * FROM services WHERE id=? AND active=1', [service_id]);
  if (!svc) return res.status(404).json({ error: 'Servicio no encontrado' });

  const worker = queryOne('SELECT id FROM users WHERE id=? AND role=? AND active=1', [worker_id, 'trabajador']);
  if (!worker) return res.status(404).json({ error: 'Barbero no encontrado' });

  const id = run(
    `INSERT INTO bookings(client_name,service_id,worker_id,date,time,amount)
     VALUES(?,?,?,?,?,?)`,
    [client_name.trim(), service_id, worker_id, date, time, svc.price]
  );

  res.status(201).json(queryOne(
    `SELECT b.*, s.name as service_name, u.name as worker_name
     FROM bookings b JOIN services s ON s.id=b.service_id JOIN users u ON u.id=b.worker_id
     WHERE b.id=?`, [id]
  ));
});

router.patch('/:id/status', requireWorker, (req, res) => {
  const { status } = req.body;
  if (!['confirmada','completada','cancelada'].includes(status))
    return res.status(400).json({ error: 'Estado inválido' });

  const b = queryOne('SELECT * FROM bookings WHERE id=?', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'No encontrada' });

  if (req.user.role === 'trabajador' && b.worker_id !== req.user.id)
    return res.status(403).json({ error: 'Solo puedes editar tus propias citas' });

  run('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id]);

  if (status === 'completada') {
    run('UPDATE services SET unidades_vendidas = unidades_vendidas + 1 WHERE id=?', [b.service_id]);
  }

  res.json({ ok: true, id: parseInt(req.params.id), status });
});

router.patch('/:id/rating', (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });

  const b = queryOne(`SELECT * FROM bookings WHERE id=? AND status='completada'`, [req.params.id]);
  if (!b) return res.status(404).json({ error: 'Reserva completada no encontrada' });

  run('UPDATE bookings SET rating=? WHERE id=?', [rating, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const b = queryOne('SELECT id FROM bookings WHERE id=?', [req.params.id]);
  if (!b) return res.status(404).json({ error: 'No encontrada' });
  run('DELETE FROM bookings WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
