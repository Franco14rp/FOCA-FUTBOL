import React, { useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from './firebase';
import { UserContext } from './App'; // Import UserContext
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './App.css';

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const currentUser = useContext(UserContext); // Get current user from context
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    if (currentUser && currentUser.uid === uid) {
      alert('No puedes cambiar tu propio rol.');
      return;
    }
    if (currentUser && currentUser.role !== 'master') {
      alert('Solo el usuario Master puede cambiar roles.');
      return;
    }
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { role: newRole });
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
