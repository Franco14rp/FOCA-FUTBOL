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
import { api, getToken, setToken } from './api';

export const UserContext = createContext(null);

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // New loading state
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
          navigate('/');
        }
        return;
      }
      try {
        const me = await api.me();
        setUser(me);
      } catch (error) {
        // Token inválido o expirado
        setToken(null);
        setUser(null);
        if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('/');
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
