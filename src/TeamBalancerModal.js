import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from './firebase';
import './App.css';

// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

async function fetchPlayersWithStats(playerNames) {
  if (!playerNames || playerNames.length === 0) return [];
  const playerStatsQuery = query(collection(db, "playerStats"), where("name", "in", playerNames));
  const playerStatsSnapshot = await getDocs(playerStatsQuery);
  return playerStatsSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    skillScore: doc.data().promedio || 0
  }));
}

function TeamBalancerModal({ match, user, onClose }) {
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayerA, setSelectedPlayerA] = useState(null);
  const [selectedPlayerB, setSelectedPlayerB] = useState(null);

  const balanceAndSaveTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const playersWithStats = await fetchPlayersWithStats(match.players);
      if (playersWithStats.length === 0) {
        setError("No hay jugadores en este partido para sortear.");
        return;
      }

      const shuffledPlayers = shuffleArray([...playersWithStats]);
      shuffledPlayers.sort((a, b) => b.skillScore - a.skillScore);

      let currentTeamA = [];
      let currentTeamB = [];
      let scoreA = 0;
      let scoreB = 0;

      shuffledPlayers.forEach(player => {
        if (scoreA <= scoreB) {
          currentTeamA.push(player);
          scoreA += player.skillScore;
        } else {
          currentTeamB.push(player);
          scoreB += player.skillScore;
        }
      });

      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, {
        teamA: currentTeamA.map(p => p.name),
        teamB: currentTeamB.map(p => p.name),
      });

      setTeamA(currentTeamA);
      setTeamB(currentTeamB);
    } catch (err) {
      console.error("Error al balancear equipos:", err);
      setError("Error al cargar las estadísticas de los jugadores.");
    } finally {
      setLoading(false);
    }
  }, [match.id, match.players]);

  useEffect(() => {
    const initializeTeams = async () => {
      setLoading(true);
      if (match.teamA && match.teamB) {
        const [playersA, playersB] = await Promise.all([
          fetchPlayersWithStats(match.teamA),
          fetchPlayersWithStats(match.teamB)
        ]);
        setTeamA(playersA);
        setTeamB(playersB);
        setLoading(false);
      } else {
        await balanceAndSaveTeams();
      }
    };
    initializeTeams();
  }, [match, balanceAndSaveTeams]);

  const handleResortearClick = () => {
    if (window.confirm('¿Estás seguro de que quieres volver a sortear los equipos?')) {
      balanceAndSaveTeams();
      setSelectedPlayerA(null);
      setSelectedPlayerB(null);
    }
  };

  const handleSelectPlayer = (player, team) => {
    if (!user || (user.role !== 'master' && user.uid !== match.createdBy)) return;
    if (team === 'A') {
      setSelectedPlayerA(selectedPlayerA && selectedPlayerA.id === player.id ? null : player);
    } else {
      setSelectedPlayerB(selectedPlayerB && selectedPlayerB.id === player.id ? null : player);
    }
  };

  const handleSwapPlayers = async () => {
    if (!selectedPlayerA || !selectedPlayerB) return;

    const newTeamA = teamA.filter(p => p.id !== selectedPlayerA.id).concat(selectedPlayerB);
    const newTeamB = teamB.filter(p => p.id !== selectedPlayerB.id).concat(selectedPlayerA);

    const matchRef = doc(db, "matches", match.id);
    await updateDoc(matchRef, {
      teamA: newTeamA.map(p => p.name),
      teamB: newTeamB.map(p => p.name),
    });

    setTeamA(newTeamA);
    setTeamB(newTeamB);

    setSelectedPlayerA(null);
    setSelectedPlayerB(null);
  };

  return (
    <div className="Modal-overlay">
      <div className="Modal-content">
        <button className="Close-modal-button" onClick={onClose}>❌</button>
        <h2>Equipos Sorteados</h2>
        {loading && <p>Cargando jugadores y balanceando equipos...</p>}
        {error && <p className="Error-message">{error}</p>}
        {!loading && !error && (
          <div className="Teams-container Teams-container-horizontal">
            <div className="Team-column">
              <h3>Equipo A</h3>
              <ul className="Players-list-modal">
                {teamA.map(player => (
                  <li 
                    key={player.id} 
                    className={selectedPlayerA && selectedPlayerA.id === player.id ? 'selected' : ''}
                    onClick={() => handleSelectPlayer(player, 'A')}
                  >
                    {player.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="Team-column">
              <h3>Equipo B</h3>
              <ul className="Players-list-modal">
                {teamB.map(player => (
                  <li 
                    key={player.id} 
                    className={selectedPlayerB && selectedPlayerB.id === player.id ? 'selected' : ''}
                    onClick={() => handleSelectPlayer(player, 'B')}
                  >
                    {player.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="Modal-actions">
          {(user && (user.role === 'master' || user.uid === match.createdBy)) && (
            <button className="Resortear-button" onClick={handleResortearClick}>🔄</button>
          )}
          <button 
            className="Swap-button"
            onClick={handleSwapPlayers} 
            disabled={!selectedPlayerA || !selectedPlayerB || !user || (user.role !== 'master' && user.uid !== match.createdBy)}
          >
            Intercambiar
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeamBalancerModal;
