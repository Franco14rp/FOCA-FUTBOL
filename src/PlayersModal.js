import React from 'react';
import './App.css';

function PlayersModal({ players, matchId, createdBy, onRemovePlayer, onClose }) {
  if (!players) return null;

  return (
    <div className="Modal-overlay" onClick={onClose}>
      <div className="Modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Jugadores Anotados</h2>
        {players.length === 0 ? (
          <p>No hay jugadores anotados aún.</p>
        ) : (
          <ul className="Players-list-modal">
            {players.map((player, index) => (
              <li key={index}>
                {player}
                <button className="Remove-player-button" onClick={() => onRemovePlayer(matchId, player, createdBy)}>🗑️</button>
              </li>
            ))}
          </ul>
        )}
        <button className="Create-match-button" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

export default PlayersModal;
