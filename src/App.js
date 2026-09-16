import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import CreateMatchPage from './CreateMatchPage';
import MatchListPage from './MatchListPage';
import RegisterPage from './RegisterPage';
import UserManagementPage from './UserManagementPage';
import PlayerStatsPage from './PlayerStatsPage';
import PlayedMatchesPage from './PlayedMatchesPage'; // New import
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export const UserContext = createContext(null);

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // New loading state
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser({ ...firebaseUser, ...docSnap.data() });
        } else {
          // User might have authenticated but no profile yet (e.g., new user)
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
          navigate('/'); // Redirect to login if no user and not on login/register page
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      alert(`Error al cerrar sesión: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="App-header">
        <img src="https://i.imgur.com/iXk16DB.png" alt="Cargando..." className="Loading-spinner" />
      </div>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={user ? <HomePage onLogout={handleLogout} /> : <LoginPage />} />
          <Route path="/create-match" element={user && (user.role === 'master' || user.role === 'admin') ? <CreateMatchPage /> : <LoginPage />} />
          <Route path="/matches" element={user ? <MatchListPage /> : <LoginPage />} />
          <Route path="/user-management" element={user && user.role === 'master' ? <UserManagementPage /> : <LoginPage />} />
          <Route path="/player-stats" element={user && user.role === 'master' ? <PlayerStatsPage /> : <LoginPage />} />
          <Route path="/played-matches" element={user ? <PlayedMatchesPage /> : <LoginPage />} />
        </Routes>
      </div>
    </UserContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <AuthWrapper />
    </Router>
  );
}

export default App;
