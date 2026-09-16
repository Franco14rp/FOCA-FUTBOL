import React, { useState } from 'react';
import './App.css';

function FinalizeMatchModal({ match, onFinalize, onClose }) {
  const [winner, setWinner] = useState('');
  const [score, setScore] = useState('');
  const [playersPlayed, setPlayersPlayed] = useState(match.players || []);

  const handleFinalize = () => {
    if (!winner || !score) {
      alert('Por favor, selecciona un ganador y el marcador.');
      return;
    }
    onFinalize(match.id, winner, score, playersPlayed);
  };

  return (
    <div className="Modal-overlay" onClick={onClose}>
      <div className="Modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Finalizar Partido: {match.field} - {match.date}</h2>
        <p>Jugadores anotados: {match.players ? match.players.length : 0}/{match.participants}</p>

        <label>Ganador:</label>
        <select value={winner} onChange={(e) => setWinner(e.target.value)} className="Login-input">
          <option value="">Seleccionar Ganador</option>
          <option value="Equipo A">Equipo A</option>
          <option value="Equipo B">Equipo B</option>
          <option value="Empate">Empate</option>
        </select>

        <label>Marcador (ej. 3-2):</label>
        <input
          type="text"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="Login-input"
          placeholder="Ej. 3-2"
        />

        <h3>Jugadores que jugaron:</h3>
        <div className="Players-checkbox-list">
          {match.players && match.players.map(player => (
            <label key={player}>
              <input
                type="checkbox"
                checked={playersPlayed.includes(player)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPlayersPlayed([...playersPlayed, player]);
                  } else {
                    setPlayersPlayed(playersPlayed.filter(p => p !== player));
                  }
                }}
              />
              {player}
            </label>
          ))}
        </div>

        <button className="Create-match-button" onClick={handleFinalize}>Finalizar</button>
        <button className="Create-match-button" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

export default FinalizeMatchModal;
