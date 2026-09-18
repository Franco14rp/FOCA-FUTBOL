import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import './App.css';

const POLL_INTERVAL_MS = 5000;

function PlayerStatsPage() {
  const [playerStats, setPlayerStats] = useState([]);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newAtaque, setNewAtaque] = useState(65);
  const [newDefensa, setNewDefensa] = useState(65);
  const [newCorre, setNewCorre] = useState(65);
  const [newUid, setNewUid] = useState(''); // Optional UID for linking

  const statOptions = [30, 65, 100];

  const loadPlayerStats = useCallback(async () => {
    try {
      const data = await api.getPlayerStats();
      setPlayerStats(data);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, []);

  useEffect(() => {
    loadPlayerStats();
    const interval = setInterval(loadPlayerStats, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadPlayerStats]);

  const handleAddPlayerStats = async () => {
    if (!newName) {
      alert('El nombre del jugador es obligatorio.');
      return;
    }
    try {
      await api.createPlayerStats({ name: newName, ataque: newAtaque, defensa: newDefensa, corre: newCorre, uid: newUid });
      setNewName('');
      setNewAtaque(65);
      setNewDefensa(65);
      setNewCorre(65);
      setNewUid('');
      loadPlayerStats();
    } catch (e) {
      alert(`Error al añadir estadísticas: ${e.message}`);
    }
  };

  const handleEditPlayerStats = (stats) => {
    setEditingPlayerId(stats.id);
    setNewName(stats.name);
    setNewAtaque(stats.ataque);
    setNewDefensa(stats.defensa);
    setNewCorre(stats.corre);
    setNewUid(stats.uid || '');
  };

  const handleSavePlayerStats = async (id) => {
    try {
      await api.updatePlayerStats(id, { name: newName, ataque: newAtaque, defensa: newDefensa, corre: newCorre, uid: newUid });
      setEditingPlayerId(null);
      setNewName('');
      setNewAtaque(65);
      setNewDefensa(65);
      setNewCorre(65);
      setNewUid('');
      loadPlayerStats();
    } catch (e) {
      alert(`Error al guardar estadísticas: ${e.message}`);
    }
  };

  const handleDeletePlayerStats = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar estas estadísticas de jugador?')) {
      try {
        await api.deletePlayerStats(id);
        loadPlayerStats();
      } catch (e) {
        alert(`Error al eliminar estadísticas: ${e.message}`);
      }
    }
  };

  return (
    <div className="App-header">
      <button className="Back-button" onClick={() => window.history.back()}>Atrás</button>
      <h1>Gestionar Estadísticas de Jugadores</h1>

      <div className="Player-stats-form">
        <h2>{editingPlayerId ? 'Editar Estadísticas' : 'Añadir Nuevas Estadísticas'}</h2>
        <input
          type="text"
          placeholder="Nombre del Jugador"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="Login-input"
        />

        <label>Ataque:</label>
        <select value={newAtaque} onChange={(e) => setNewAtaque(e.target.value)} className="Login-input">
          {statOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <label>Defensa:</label>
        <select value={newDefensa} onChange={(e) => setNewDefensa(e.target.value)} className="Login-input">
          {statOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <label>Corre:</label>
        <select value={newCorre} onChange={(e) => setNewCorre(e.target.value)} className="Login-input">
          {statOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="UID del Usuario (Opcional)"
          value={newUid}
          onChange={(e) => setNewUid(e.target.value)}
          className="Login-input"
        />
        {editingPlayerId ? (
          <>
            <button className="Create-match-button" onClick={() => handleSavePlayerStats(editingPlayerId)}>Guardar Cambios</button>
            <button className="Create-match-button" onClick={() => setEditingPlayerId(null)}>Cancelar</button>
          </>
        ) : (
          <button className="Create-match-button" onClick={handleAddPlayerStats}>Añadir Estadísticas</button>
        )}
      </div>

      <div className="Player-stats-list-container">
        <h2>Estadísticas Existentes</h2>
        {playerStats.length === 0 ? (
          <p>No hay estadísticas de jugadores aún.</p>
        ) : (
          playerStats.map(stats => (
            <div key={stats.id} className="Player-stats-card">
              <p><strong>Nombre:</strong> {stats.name}</p>
              <p><strong>Ataque:</strong> {stats.ataque}</p>
              <p><strong>Defensa:</strong> {stats.defensa}</p>
              <p><strong>Corre:</strong> {stats.corre}</p>
              <p><strong>Plus:</strong> {stats.plus}</p>
              <p><strong>Promedio:</strong> {stats.promedio}%</p>
              {stats.uid && <p><strong>UID:</strong> {stats.uid}</p>}
              <button className="Edit-button" onClick={() => handleEditPlayerStats(stats)}>Editar</button>
              <button className="Delete-button" onClick={() => handleDeletePlayerStats(stats.id)}>Eliminar</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PlayerStatsPage;
