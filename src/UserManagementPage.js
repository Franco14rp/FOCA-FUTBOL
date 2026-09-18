import React, { useState, useEffect, useContext, useCallback } from 'react';
import { api } from './api';
import { UserContext } from './App'; // Import UserContext
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './App.css';

const POLL_INTERVAL_MS = 5000;

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const currentUser = useContext(UserContext); // Get current user from context
  const navigate = useNavigate(); // Initialize useNavigate

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadUsers]);

  const handleRoleChange = async (uid, newRole) => {
    if (currentUser && currentUser.uid === uid) {
      alert('No puedes cambiar tu propio rol.');
      return;
    }
    if (currentUser && currentUser.role !== 'master') {
      alert('Solo el usuario Master puede cambiar roles.');
      return;
    }
    try {
      await api.updateUserRole(uid, newRole);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="App-header">
      <button className="Back-button" onClick={() => navigate(-1)}>Atrás</button>
      <h1>Administrar Usuarios</h1>
      <div className="User-list-container">
        {users.map(user => (
          <div key={user.uid} className="User-card">
            <p><strong>Nombre:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Rol:</strong> {user.role}</p>
            {user.role !== 'master' && currentUser && currentUser.role === 'master' && (
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                className="Login-input"
              >
                <option value="admin">Admin</option>
                <option value="common">Común</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserManagementPage;
