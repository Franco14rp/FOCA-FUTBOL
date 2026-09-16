import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from './firebase';
import './App.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
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
