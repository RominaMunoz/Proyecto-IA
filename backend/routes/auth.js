const express = require('express');
const bcrypt  = require('bcryptjs');
const { queryOne } = require('../database');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = queryOne(
    'SELECT * FROM users WHERE email = ? AND active = 1',
    [email.toLowerCase().trim()]
  );

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = signToken({
    id:       user.id,
    name:     user.name,
    initials: user.initials,
    email:    user.email,
    role:     user.role,
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, initials: user.initials, email: user.email, role: user.role }
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
