import React, { useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from './firebase';
import { UserContext } from './App';
import { useNavigate } from 'react-router-dom';
import './App.css';

function PlayedMatchesPage() {
  const navigate = useNavigate();
  const [playedMatches, setPlayedMatches] = useState([]);
  const user = useContext(UserContext);
  const currentUserName = user && user.name ? user.name : user ? user.email : "";

  useEffect(() => {
    if (!currentUserName) return;

    const q = query(
      collection(db, "matches"),
      where("status", "==", "finalized"),
      where("playersPlayed", "array-contains", currentUserName)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlayedMatches(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => unsubscribe();
  }, [currentUserName]);

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
