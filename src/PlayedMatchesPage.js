import React, { useState, useEffect, useContext, useCallback } from 'react';
import { api } from './api';
import { UserContext } from './App';
import { useNavigate } from 'react-router-dom';
import './App.css';

const POLL_INTERVAL_MS = 5000;

function PlayedMatchesPage() {
  const navigate = useNavigate();
  const [playedMatches, setPlayedMatches] = useState([]);
  const user = useContext(UserContext);
  const currentUserName = user && user.name ? user.name : user ? user.email : "";

  const loadPlayedMatches = useCallback(async () => {
    if (!currentUserName) return;
    try {
      const data = await api.getMatches({ status: 'finalized', player: currentUserName });
      setPlayedMatches(data);
    } catch (err) {
      console.error('Error al cargar los partidos jugados:', err);
    }
  }, [currentUserName]);

  useEffect(() => {
    loadPlayedMatches();
    const interval = setInterval(loadPlayedMatches, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadPlayedMatches]);

  return (
    <div className="App-header">
      <button className="Back-button" onClick={() => navigate(-1)}>Atrás</button>
      <h1>Mis Partidos Jugados</h1>
      {playedMatches.length === 0 ? (
        <p>No has jugado ningún partido finalizado aún.</p>
      ) : (
        <div className="Match-list-container">
          {playedMatches.map(match => (
            <div key={match.id} className="Match-card">
              <p><strong>Cancha:</strong> {match.field}</p>
              <p><strong>Horario:</strong> {match.time}:00</p>
              <p><strong>Fecha:</strong> {match.date}</p>
              <p><strong>Marcador:</strong> {match.score}</p>
              <p><strong>Ganador:</strong> {match.winner}</p>
              <p><strong>Jugaste con:</strong> {match.playersPlayed.filter(p => p !== currentUserName).join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlayedMatchesPage;
