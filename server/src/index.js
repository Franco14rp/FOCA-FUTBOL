require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const playerStatsRoutes = require('./routes/playerStats');
const matchesRoutes = require('./routes/matches');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes(prisma));
app.use('/api/users', usersRoutes(prisma));
app.use('/api/player-stats', playerStatsRoutes(prisma));
app.use('/api/matches', matchesRoutes(prisma));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Foca Fútbol API escuchando en http://localhost:${PORT}`);
});
