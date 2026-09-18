import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import PlayersModal from './PlayersModal';
import AddPlayerModal from './AddPlayerModal';
import FinalizeMatchModal from './FinalizeMatchModal'; // New import
import TeamBalancerModal from './TeamBalancerModal';
import { UserContext } from './App'; // Import UserContext
import './App.css';

const POLL_INTERVAL_MS = 5000;

function MatchListPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editedField, setEditedField] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [playersInModal, setPlayersInModal] = useState([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [currentMatchToAddPlayer, setCurrentMatchToAddPlayer] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false); // New state
  const [matchToFinalize, setMatchToFinalize] = useState(null); // New state
  const [showTeamBalancerModal, setShowTeamBalancerModal] = useState(false); // New state for team balancer

  const user = useContext(UserContext); // Get user from context
  const currentUserName = user && user.name ? user.name : user ? user.email : ""; // Use authenticated user's name or email

  const loadMatches = useCallback(async () => {
    try {
      const data = await api.getMatches({ status: 'pending' });
      setMatches(data);
    } catch (err) {
      console.error('Error al cargar los partidos:', err);
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadMatches]);

  const handleJoinMatch = async (id) => {
    try {
      await api.joinMatch(id);
      loadMatches();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMatch = async (id, createdBy) => {
    if (user.role !== 'master' && user.uid !== createdBy) {
      alert('No tienes permiso para eliminar este partido.');
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este partido?')) {
      await api.deleteMatch(id);
      loadMatches();
    }
  };

  const handleEditMatch = (match) => {
    if (user.role !== 'master' && user.uid !== match.createdBy) {
      alert('No tienes permiso para editar este partido.');
      return;
    }
    setEditingMatchId(match.id);
    setEditedField(match.field);
    setEditedTime(match.time);
    setEditedDate(match.date);
  };

  const handleSaveEdit = async (id, createdBy) => {
    if (user.role !== 'master' && user.uid !== createdBy) {
      alert('No tienes permiso para guardar los cambios de este partido.');
      return;
    }
    await api.updateMatch(id, { field: editedField, time: editedTime, date: editedDate });
    setEditingMatchId(null);
    loadMatches();
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
  };

  const handleViewPlayers = (players, matchId, createdBy) => {
    setPlayersInModal(players);
    setCurrentMatchToAddPlayer({ id: matchId, createdBy: createdBy }); // Store match info for player removal
    setShowPlayersModal(true);
  };

  const handleRemovePlayerFromMatch = async (matchId, playerName, createdBy) => {
    if (user.role !== 'master' && user.uid !== createdBy) {
      alert('Que borras Gil 🇧🇴');
      return;
    }
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${playerName} del partido?`)) {
      await api.removePlayerFromMatch(matchId, playerName);
      setShowPlayersModal(false); // Close modal after removal
      loadMatches();
    }
  };

  const handleAddPlayerClick = async (match) => {
    if (!user || (user.role !== 'master' && user.role !== 'admin')) {
      alert('No tienes permiso para añadir jugadores.');
      return;
    }
    if (match.players && match.players.length >= parseInt(match.participants)) {
      alert('Partido Lleno Pajareaste 🐦🐦🐦');
      return;
    }
    setCurrentMatchToAddPlayer(match);
    const allPlayers = await api.getPlayerStats();
    const playersInMatch = match.players || [];
    const filteredPlayers = allPlayers.filter(player => !playersInMatch.includes(player.name));
    setAvailablePlayers(filteredPlayers);
    setShowAddPlayerModal(true);
  };

  const handleSelectPlayer = async (playerName) => {
    if (currentMatchToAddPlayer) {
      try {
        await api.addPlayerToMatch(currentMatchToAddPlayer.id, playerName);
        setShowAddPlayerModal(false);
        setCurrentMatchToAddPlayer(null);
        loadMatches();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleFinalizeMatchClick = (match) => {
    if (user.role !== 'master' && user.uid !== match.createdBy) {
      alert('No tienes permiso para finalizar este partido.');
      return;
    }
    setMatchToFinalize(match);
    setShowFinalizeModal(true);
  };

  const handleFinalizeMatch = async (matchId, winner, score, playersPlayed) => {
    await api.finalizeMatch(matchId, winner, score, playersPlayed);
    setShowFinalizeModal(false);
    setMatchToFinalize(null);
    loadMatches();
  };

  const handleEquiposClick = (match) => {
    // If teams haven't been generated yet
    if (!match.teamA) {
      // Check for permissions to generate for the first time
      if (user && (user.role === 'master' || user.uid === match.createdBy)) {
        setCurrentMatchToAddPlayer(match);
        setShowTeamBalancerModal(true);
      } else {
        alert('Que tocas logi! Aun no estan los equipos!');
      }
    } else {
      // If teams already exist, anyone can view them
      setCurrentMatchToAddPlayer(match);
      setShowTeamBalancerModal(true);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="App-header MatchListPage">
      <button className="Back-button" onClick={() => navigate(-1)}>Atrás</button>
      <h1>Pinta Partido <img src="https://i.imgur.com/6DHuTNO.png" alt="Pelota giratoria" className="Loading-spinner" style={{ width: '40px', height: '40px', verticalAlign: 'middle', marginLeft: '10px' }} /></h1>
      {matches.length === 0 ? (
        <p>No hay partidos creados aún.</p>
      ) : (
        <div className="Match-list-container">
          {matches.map(match => (
            <div key={match.id} className="Match-card">
              {editingMatchId === match.id ? (
                <div className="Edit-form">
                  <input
                    type="text"
                    value={editedField}
                    onChange={(e) => setEditedField(e.target.value)}
                    className="Login-input"
                  />
                  <select value={editedTime} onChange={(e) => setEditedTime(e.target.value)} className="Login-input">
                    {hours.map((hour) => (
                      <option key={hour} value={hour}>{hour}:00</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="Login-input"
                  />
                  <button className="Create-match-button" onClick={() => handleSaveEdit(match.id, match.createdBy)}>Guardar</button>
                  <button className="Create-match-button" onClick={handleCancelEdit}>Cancelar</button>
                </div>
              ) : (
                <>
                  <p><strong>Cancha:</strong> {match.field}
                    {match.field === 'Outdoors' && (
                      <button className="View-on-map-button" onClick={() => window.open('https://maps.app.goo.gl/ntJfkGyV5AJuS4n26', '_blank')}>
                        Ver en mapa📍
                      </button>
                    )}
                  </p>
                  <p><strong>Horario:</strong> {match.time}:00</p>
                  <p><strong>Fecha:</strong> {match.date}</p>
                  <p>
                    <strong>Participantes:</strong> {match.players ? match.players.length : 0}/{match.participants}
                    <button className="View-players-button" onClick={() => handleViewPlayers(match.players, match.id, match.createdBy)}>
                      Ver
                    </button>
                    {match.status !== 'finalized' && (
                      <>
                        {(user && (user.role === 'master' || user.role === 'admin')) && (
                          <button className="Add-player-button" onClick={() => handleAddPlayerClick(match)}>ADD Player</button>
                        )}
                        <button className="Create-teams-button" onClick={() => handleEquiposClick(match)}>Equipos</button>
                      </>
                    )}
                  </p>
                  {match.status !== 'finalized' ? (
                    <button
                      className={match.players && match.players.includes(currentUserName) ? 'Leave-button' : 'Join-button'}
                      onClick={() => handleJoinMatch(match.id)}
                    >
                      {match.players && match.players.includes(currentUserName) ? 'Me bajo' : 'Me anoto'}
                    </button>
                  ) : (
                    <p><strong>Estado:</strong> Finalizado - {match.winner} ganó {match.score}</p>
                  )}
                  {(user && (user.role === 'master' || user.uid === match.createdBy)) && match.status === 'pending' && (
                    <button className="Edit-button" onClick={() => handleEditMatch(match)}>Editar</button>
                  )}
                  {(user && (user.role === 'master' || user.uid === match.createdBy)) && match.status === 'pending' && (
                    <button className="Delete-button" onClick={() => handleDeleteMatch(match.id, match.createdBy)}>Eliminar</button>
                  )}
                  {(user && (user.role === 'master' || user.uid === match.createdBy)) && match.status === 'pending' && (
                    <button className="Finalize-button" onClick={() => handleFinalizeMatchClick(match)}>Finalizar Partido</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {(user && (user.role === 'master' || user.role === 'admin')) && (
        <button className="Create-match-button" onClick={() => navigate('/create-match')}>Crear Nuevo Partido</button>
      )}

      {showPlayersModal && (
        <PlayersModal
          players={playersInModal}
          matchId={currentMatchToAddPlayer ? currentMatchToAddPlayer.id : null}
          createdBy={currentMatchToAddPlayer ? currentMatchToAddPlayer.createdBy : null}
          onRemovePlayer={handleRemovePlayerFromMatch}
          onClose={() => setShowPlayersModal(false)}
        />
      )}

      {showAddPlayerModal && (
        <AddPlayerModal
          availablePlayers={availablePlayers}
          onSelectPlayer={handleSelectPlayer}
          onClose={() => setShowAddPlayerModal(false)}
        />
      )}

      {showFinalizeModal && matchToFinalize && (
        <FinalizeMatchModal
          match={matchToFinalize}
          onFinalize={handleFinalizeMatch}
          onClose={() => setShowFinalizeModal(false)}
        />
      )}

      {showTeamBalancerModal && currentMatchToAddPlayer && (
        <TeamBalancerModal
          match={currentMatchToAddPlayer}
          user={user} // Pass user prop
          onClose={() => { setShowTeamBalancerModal(false); loadMatches(); }}
        />
      )}
    </div>
  );
}

export default MatchListPage;
