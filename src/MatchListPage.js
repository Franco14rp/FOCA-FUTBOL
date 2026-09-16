import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from './firebase';
import PlayersModal from './PlayersModal';
import AddPlayerModal from './AddPlayerModal';
import FinalizeMatchModal from './FinalizeMatchModal'; // New import
import TeamBalancerModal from './TeamBalancerModal';
import { UserContext } from './App'; // Import UserContext
import './App.css';

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

  useEffect(() => {
    const q = query(collection(db, "matches"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const handleJoinMatch = async (id, currentPlayers, capacity) => {
    const matchRef = doc(db, "matches", id);
    let updatedPlayers;

    if (currentPlayers.includes(currentUserName)) {
      // User wants to leave
      updatedPlayers = currentPlayers.filter(player => player !== currentUserName);
    } else {
      // User wants to join
      if (currentPlayers.length < capacity) {
        updatedPlayers = [...currentPlayers, currentUserName];
      } else {
        alert('El partido está lleno.');
        return;
      }
    }
    await updateDoc(matchRef, { players: updatedPlayers });
  };

  const handleDeleteMatch = async (id, createdBy) => {
    if (user.role !== 'master' && user.uid !== createdBy) {
      alert('No tienes permiso para eliminar este partido.');
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este partido?')) {
      await deleteDoc(doc(db, "matches", id));
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
    const matchRef = doc(db, "matches", id);
    await updateDoc(matchRef, { field: editedField, time: editedTime, date: editedDate });
    setEditingMatchId(null);
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
      const matchRef = doc(db, "matches", matchId);
      const matchToUpdate = matches.find(m => m.id === matchId);
      if (matchToUpdate) {
        const updatedPlayers = matchToUpdate.players.filter(player => player !== playerName);
        await updateDoc(matchRef, { players: updatedPlayers });
        setShowPlayersModal(false); // Close modal after removal
        // If the current user was the one removed, and it's their own match, they might need to leave
        if (playerName === currentUserName) {
          // Optionally, you might want to navigate them away or update their joined status
        }
      }
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
    const playerStatsSnapshot = await getDocs(collection(db, "playerStats"));
    const allPlayers = playerStatsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const playersInMatch = match.players || [];
    const filteredPlayers = allPlayers.filter(player => !playersInMatch.includes(player.name));
    setAvailablePlayers(filteredPlayers);
    setShowAddPlayerModal(true);
  };

  const handleSelectPlayer = async (playerName) => {
    if (currentMatchToAddPlayer) {
      const matchRef = doc(db, "matches", currentMatchToAddPlayer.id);
      const updatedPlayers = [...(currentMatchToAddPlayer.players || []), playerName];
      await updateDoc(matchRef, { players: updatedPlayers });
      setShowAddPlayerModal(false);
      setCurrentMatchToAddPlayer(null);
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
    const matchRef = doc(db, "matches", matchId);
    await updateDoc(matchRef, {
      status: 'finalized',
      winner: winner,
      score: score,
      playersPlayed: playersPlayed, // Store players who actually played
    });
    setShowFinalizeModal(false);
    setMatchToFinalize(null);
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
                      onClick={() => handleJoinMatch(match.id, match.players || [], parseInt(match.participants))}
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
          onClose={() => setShowTeamBalancerModal(false)}
        />
      )}
    </div>
  );
}

export default MatchListPage;
