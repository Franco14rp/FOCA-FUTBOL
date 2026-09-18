const express = require('express');
const { requireAuth, requireRole } = require('../auth');

function calcPromedio(ataque, defensa, corre) {
  return parseFloat((((ataque + defensa + corre) / 300) * 100).toFixed(2));
}

module.exports = function playerStatsRoutes(prisma) {
  const router = express.Router();
  router.use(requireAuth(prisma));

  // GET /api/player-stats            -> todos
  // GET /api/player-stats?names=a,b  -> filtrado por nombre (usado por el balanceador de equipos)
  router.get('/', async (req, res) => {
    const { names } = req.query;
    const where = names
      ? { name: { in: String(names).split(',').filter(Boolean) } }
      : {};
    const stats = await prisma.playerStats.findMany({ where, orderBy: { name: 'asc' } });
    res.json(stats);
  });

  router.post('/', requireRole('master'), async (req, res) => {
    const { name, ataque, defensa, corre, uid } = req.body || {};
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const promedio = calcPromedio(Number(ataque), Number(defensa), Number(corre));
    const created = await prisma.playerStats.create({
      data: {
        name,
        ataque: Number(ataque),
        defensa: Number(defensa),
        corre: Number(corre),
        plus: 0,
        promedio,
        userId: uid || null,
      },
    });
    res.status(201).json(created);
  });

  router.patch('/:id', requireRole('master'), async (req, res) => {
    const { name, ataque, defensa, corre, uid } = req.body || {};
    const promedio = calcPromedio(Number(ataque), Number(defensa), Number(corre));
    const updated = await prisma.playerStats.update({
      where: { id: req.params.id },
      data: {
        name,
        ataque: Number(ataque),
        defensa: Number(defensa),
        corre: Number(corre),
        promedio,
        userId: uid || null,
      },
    });
    res.json(updated);
  });

  router.delete('/:id', requireRole('master'), async (req, res) => {
    await prisma.playerStats.delete({ where: { id: req.params.id } });
    res.status(204).end();
  });

  return router;
};
