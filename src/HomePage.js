import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './App'; // Import UserContext
import TypingEffect from './TypingEffect'; // New import
import './App.css'; // Reusing App.css for general styling

function HomePage({ onLogout }) {
  const navigate = useNavigate();
  const user = useContext(UserContext); // Get user from context

  const handleAvailableMatchesClick = () => {
    navigate('/matches');
  };

  const welcomeText = `Bienvenido, ${user && user.name ? user.name : user ? user.email : 'Invitado'}`;

  return (
    <div className="App-header">
      <img src="https://i.imgur.com/WJvoj7S.png" alt="Opciones Logo" className="Home-logo" />
      <TypingEffect text={welcomeText} />
      <button className="Home-button-base Available-matches-button" onClick={handleAvailableMatchesClick}>Partidos disponibles</button>
      {(user && (user.role === 'master' || user.role === 'admin')) && (
        <button className="Home-button-base Create-match-home-button" onClick={() => navigate('/create-match')}>Crear partido</button>
      )}
      <button className="Home-button-base Played-matches-button" onClick={() => navigate('/played-matches')}>Partidos Jugados</button>
      {(user && user.role === 'master') && (
        <button className="Home-button-base Manage-users-button" onClick={() => navigate('/user-management')}>Administrar usuarios</button>
      )}
      {(user && user.role === 'master') && (
        <button className="Home-button-base Manage-users-button" onClick={() => navigate('/player-stats')}>Stats</button>
      )}
      <button className="Home-button-base Leave-button" onClick={onLogout}>Cerrar Sesión</button>
    </div>
  );
}

export default HomePage;
