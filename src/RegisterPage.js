import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import './App.css';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // New state for name
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await api.register(email, password, name);
      alert('Registro exitoso! Ahora puedes iniciar sesión.');
      navigate('/'); // Navigate to login page
    } catch (error) {
      alert(`Error al registrar: ${error.message}`);
    }
  };

  return (
    <div className="App-header">
      <h1>Registrarse</h1>
      <input
        type="text"
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="Login-input"
      />
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
      <button className="Enter-button" onClick={handleRegister}>Registrar</button>
      <button className="Register-text-button" onClick={() => navigate('/')}>Ya tengo cuenta</button>
    </div>
  );
}

export default RegisterPage;
