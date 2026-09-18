const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'foca_futbol_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // sin body (ej. errores de red)
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Error ${res.status}`);
  }
  return data;
}

const api = {
  register: (email, password, name) => request('/auth/register', { method: 'POST', body: { email, password, name } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  getUsers: () => request('/users'),
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),

  getPlayerStats: (names) =>
    request(`/player-stats${names && names.length ? `?names=${encodeURIComponent(names.join(','))}` : ''}`),
  createPlayerStats: (data) => request('/player-stats', { method: 'POST', body: data }),
  updatePlayerStats: (id, data) => request(`/player-stats/${id}`, { method: 'PATCH', body: data }),
  deletePlayerStats: (id) => request(`/player-stats/${id}`, { method: 'DELETE' }),

  getMatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/matches${qs ? `?${qs}` : ''}`);
  },
  createMatch: (data) => request('/matches', { method: 'POST', body: data }),
  updateMatch: (id, data) => request(`/matches/${id}`, { method: 'PATCH', body: data }),
  deleteMatch: (id) => request(`/matches/${id}`, { method: 'DELETE' }),
  joinMatch: (id) => request(`/matches/${id}/join`, { method: 'POST' }),
  addPlayerToMatch: (id, playerName) => request(`/matches/${id}/players`, { method: 'POST', body: { playerName } }),
  removePlayerFromMatch: (id, playerName) =>
    request(`/matches/${id}/players/${encodeURIComponent(playerName)}`, { method: 'DELETE' }),
  saveTeams: (id, teamA, teamB) => request(`/matches/${id}/teams`, { method: 'PATCH', body: { teamA, teamB } }),
  finalizeMatch: (id, winner, score, playersPlayed) =>
    request(`/matches/${id}/finalize`, { method: 'POST', body: { winner, score, playersPlayed } }),
};

export { api, getToken, setToken };
