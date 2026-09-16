import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from './firebase';
import './App.css';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // New state for name
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Store user profile in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        name: name,
        role: 'common', // Default role for new users
      });
      // Create player stats entry
      await setDoc(doc(db, "playerStats", userCredential.user.uid), {
        name: name,
        ataque: 65,
        defensa: 65,
        corre: 65,
        plus: 0, // Default to 0, not editable
        promedio: ((65 + 65 + 65) / 300) * 100, // Calculated average
        uid: userCredential.user.uid, // Link to user UID
      });
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
