import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from "firebase/firestore";
import { db } from './firebase';
import { UserContext } from './App'; // Import UserContext
import './App.css';

function CreateMatchPage() {
  const [field, setField] = useState('');
  const [time, setTime] = useState('19'); // Default to 19:00
  const [date, setDate] = useState('');
  const [participants, setParticipants] = useState('10'); // Default to 10
  const navigate = useNavigate();
  const user = useContext(UserContext); // Get user from context

  const handleCreateMatch = async () => {
    try {
      await addDoc(collection(db, "matches"), {
        field,
        time,
        date,
        participants,
        players: [], // Initialize with an empty array of players
        createdBy: user.uid, // Store user's UID
        status: 'pending', // New status field, default to pending
      });
      alert('Partido creado exitosamente!');
      navigate('/matches'); // Navigate to match list after creating a match
    } catch (e) {
      console.error("Error adding document: ", e);
      alert('Error al crear el partido.');
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="App-header">
      <button className="Back-button" onClick={() => navigate(-1)}>Atrás</button>
      <h1>Crear Partido</h1>
      <select value={field} onChange={(e) => setField(e.target.value)} className="Login-input">
        <option value="">Seleccionar Cancha</option>
        <option value="Outdoors">Outdoors</option>
        <option value="Cancha A">Cancha A</option>
        <option value="Cancha B">Cancha B</option>
        <option value="Cancha C">Cancha C</option>
      </select>

      <select value={time} onChange={(e) => setTime(e.target.value)} className="Login-input">
        {hours.map((hour) => (
          <option key={hour} value={hour}>{hour}:00</option>
        ))}
      </select>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="Login-input"
      />

      <select value={participants} onChange={(e) => setParticipants(e.target.value)} className="Login-input">
        <option value="10">10 Participantes</option>
        <option value="12">12 Participantes</option>
        <option value="16">16 Participantes</option>
      </select>

      <button className="Create-match-button" onClick={handleCreateMatch}>Crear Partido</button>
    </div>
  );
}

export default CreateMatchPage;
