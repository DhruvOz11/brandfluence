import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { saveAuthSession } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';

const BrandLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login/brand`,
        { email, password, rememberMe }
      );

      saveAuthSession({
        token: response.data.token,
        brandId: response.data.user._id,
        userRole: response.data.user.role
      }, rememberMe);
      navigate('/brand/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Brand Login</h1>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
          />
          <span>Remember me for up to 7 days</span>
        </label>
        <p className="session-hint">Unchecked keeps you signed in only in this browser tab.</p>
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <Link to="/forgot-password?role=brand" className="auth-link">Forgot password?</Link>
      </form>
    </div>
  );
};

export default BrandLogin;