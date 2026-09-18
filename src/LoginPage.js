import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from './api';
import './App.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      // Recarga completa para que AuthWrapper vuelva a pedir /auth/me con el token nuevo.
      window.location.href = '/home';
    } catch (error) {
      alert(`Error al iniciar sesión: ${error.message}`);
    }
  };

  return (
    <div className="App-header">
      <img src="https://i.imgur.com/HovZF8V.png" alt="Logo" className="Login-logo" />
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="Login-input"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="Login-input"
        />
        <button type="submit" className="Enter-button">Entrar</button>
      </form>
      <button className="Register-text-button" onClick={() => navigate('/register')}>Registrar</button>
    </div>
  );
}

export default LoginPage;
