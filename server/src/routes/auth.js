const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, requireAuth } = require('../auth');

function calcPromedio(ataque, defensa, corre) {
  return parseFloat((((ataque + defensa + corre) / 300) * 100).toFixed(2));
}

module.exports = function authRoutes(prisma) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Faltan email, password o name' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const promedio = calcPromedio(65, 65, 65);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'common',
        playerStats: {
          create: { name, ataque: 65, defensa: 65, corre: 65, plus: 0, promedio },
        },
      },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: { uid: user.id, email: user.email, name: user.name, role: user.role } });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan email o password' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Email o contraseña inválidos' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Email o contraseña inválidos' });

    const token = signToken(user);
    res.json({ token, user: { uid: user.id, email: user.email, name: user.name, role: user.role } });
  });

  router.get('/me', requireAuth(prisma), async (req, res) => {
    const { id, email, name, role } = req.user;
    res.json({ uid: id, email, name, role });
  });

  router.post('/change-password', requireAuth(prisma), async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Faltan currentPassword o newPassword' });
    }

    const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    res.status(204).end();
  });

  return router;
};
