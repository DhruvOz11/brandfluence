import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { saveAuthSession } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const response = await axios.post(
        `${API_BASE_URL}/auth/login/admin`,
        { password, rememberMe },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { token, user } = response.data;
      if (user.role !== 'admin') {
        throw new Error('Admin login returned an invalid role');
      }

      saveAuthSession({ token, userRole: 'admin' }, rememberMe);
      navigate('/admin/dashboard');

    } catch (err) {
      setError(err.response?.data?.error || 'Admin login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Admin Login</h1>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
          />
          <span>Remember me for up to 8 hours</span>
        </label>
        <p className="session-hint">Admin password is managed by the server configuration.</p>
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Authenticating...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;