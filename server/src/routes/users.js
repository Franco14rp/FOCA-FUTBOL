const express = require('express');
const { requireAuth, requireRole } = require('../auth');

module.exports = function usersRoutes(prisma) {
  const router = express.Router();
  router.use(requireAuth(prisma));

  // Solo "master" administra usuarios, igual que en la app original.
  router.get('/', requireRole('master'), async (req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(users.map(({ id, ...rest }) => ({ uid: id, ...rest })));
  });

  router.patch('/:id/role', requireRole('master'), async (req, res) => {
    const { role } = req.body || {};
    if (!['admin', 'common'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.role === 'master') {
      return res.status(400).json({ error: 'No se puede cambiar el rol de un master' });
    }

    const { id, ...rest } = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json({ uid: id, ...rest });
  });

  return router;
};
