import React, { useState } from 'react';
import './App.css';

function AddPlayerModal({ availablePlayers, onSelectPlayer, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = availablePlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="Modal-overlay" onClick={onClose}>
      <div className="Modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Añadir Jugador</h2>
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="Login-input Search-input"
        />
        {filteredPlayers.length === 0 ? (
          <p>No hay jugadores disponibles para añadir.</p>
        ) : (
          <ul className="Players-list-modal">
            {filteredPlayers.map((playerStats) => (
              <li key={playerStats.id}>
                <span className="Player-name-modal">{playerStats.name}</span>
                <button className="Add-player-modal-button" onClick={() => onSelectPlayer(playerStats.name)}>Añadir</button>
              </li>
            ))}
          </ul>
        )}
        <button className="Create-match-button" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

export default AddPlayerModal;
