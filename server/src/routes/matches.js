const express = require('express');
const { requireAuth, requireRole } = require('../auth');

function toArray(json) {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function serialize(match) {
  const { createdById, ...rest } = match;
  return {
    ...rest,
    createdBy: createdById,
    players: toArray(match.players),
    teamA: match.teamA ? toArray(match.teamA) : null,
    teamB: match.teamB ? toArray(match.teamB) : null,
    playersPlayed: match.playersPlayed ? toArray(match.playersPlayed) : null,
  };
}

function isOwnerOrMaster(user, match) {
  return user.role === 'master' || user.id === match.createdById;
}

module.exports = function matchesRoutes(prisma) {
  const router = express.Router();
  router.use(requireAuth(prisma));

  router.get('/', async (req, res) => {
    const { status, player } = req.query;
    const where = {};
    if (status) where.status = status;

    const matches = await prisma.match.findMany({ where, orderBy: { createdAt: 'desc' } });
    let result = matches.map(serialize);

    if (player) {
      result = result.filter((m) => (m.playersPlayed || []).includes(player));
    }

    res.json(result);
  });

  router.post('/', requireRole('master', 'admin'), async (req, res) => {
    const { field, time, date, participants } = req.body || {};
    if (!field || !time || !date || !participants) {
      return res.status(400).json({ error: 'Faltan datos del partido' });
    }
    const match = await prisma.match.create({
      data: {
        field,
        time,
        date,
        participants: Number(participants),
        players: '[]',
        createdById: req.user.id,
      },
    });
    res.status(201).json(serialize(match));
  });

  router.patch('/:id', async (req, res) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (!isOwnerOrMaster(req.user, match)) {
      return res.status(403).json({ error: 'No tenés permiso para editar este partido' });
    }

    const { field, time, date } = req.body || {};
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        field: field ?? match.field,
        time: time ?? match.time,
        date: date ?? match.date,
      },
    });
    res.json(serialize(updated));
  });

  router.delete('/:id', async (req, res) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (!isOwnerOrMaster(req.user, match)) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este partido' });
    }
    await prisma.match.delete({ where: { id: match.id } });
    res.status(204).end();
  });

  // El propio usuario se anota/desanota (toggle), usando su nombre o email como identificador.
  router.post('/:id/join', async (req, res) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

    const playerName = req.user.name || req.user.email;
    const players = toArray(match.players);
    let updatedPlayers;

    if (players.includes(playerName)) {
      updatedPlayers = players.filter((p) => p !== playerName);
    } else {
      if (players.length >= match.participants) {
        return res.status(400).json({ error: 'El partido está lleno' });
      }
      updatedPlayers = [...players, playerName];
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { players: JSON.stringify(updatedPlayers) },
    });
    res.json(serialize(updated));
  });

  // Master/admin agregan a un jugador puntual (usado por AddPlayerModal).
  router.post('/:id/players', requireRole('master', 'admin'), async (req, res) => {
    const { playerName } = req.body || {};
    if (!playerName) return res.status(400).json({ error: 'Falta playerName' });

    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

    const players = toArray(match.players);
    if (players.length >= match.participants) {
      return res.status(400).json({ error: 'El partido está lleno' });
    }
    if (players.includes(playerName)) {
      return res.status(409).json({ error: 'El jugador ya está anotado' });
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { players: JSON.stringify([...players, playerName]) },
    });
    res.json(serialize(updated));
  });

  router.delete('/:id/players/:playerName', async (req, res) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (!isOwnerOrMaster(req.user, match)) {
      return res.status(403).json({ error: 'No tenés permiso para sacar jugadores de este partido' });
    }

    const players = toArray(match.players).filter((p) => p !== req.params.playerName);
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { players: JSON.stringify(players) },
    });
    res.json(serialize(updated));
  });

  // Guarda (o resortea) los equipos ya calculados por el frontend.
  router.patch('/:id/teams', async (req, res) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (!isOwnerOrMaster(req.user, match)) {
      return res.status(403).json({ error: 'No tenés permiso para modificar los equipos' });
    }

    const { teamA, teamB } = req.body || {};
    if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
      return res.status(400).json({ error: 'teamA y teamB deben ser arrays de nombres' });
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { teamA: JSON.stringify(teamA), teamB: JSON.stringify(teamB) },
    });
    res.json(serialize(updated));
  });

  router.post('/:id/finalize', async (req, res) => {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (!isOwnerOrMaster(req.user, match)) {
      return res.status(403).json({ error: 'No tenés permiso para finalizar este partido' });
    }

    const { winner, score, playersPlayed } = req.body || {};
    if (!winner || !score) {
      return res.status(400).json({ error: 'Faltan winner o score' });
    }

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'finalized',
        winner,
        score,
        playersPlayed: JSON.stringify(playersPlayed || []),
      },
    });
    res.json(serialize(updated));
  });

  return router;
};
