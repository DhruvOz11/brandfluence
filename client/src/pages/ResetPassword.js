import React, { useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import './Login.css';
import { API_BASE_URL } from '../utils/apiUrl';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/password/reset`,
        { token, password }
      );
      setMessage(response.data.message);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.error
        || 'Unable to reset your password. Request a new link and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Choose a new password</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength="8"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
        />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength="8"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          required
        />
        {message && <p className="auth-message success" role="status">{message}</p>}
        {error && <p className="auth-message error" role="alert">{error}</p>}
        {!message && (
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        )}
        {message && (
          <div className="auth-link">
            <Link to="/brand/login">Brand login</Link>
            {' or '}
            <Link to="/creator/login">Creator login</Link>
          </div>
        )}
      </form>
    </div>
  );
};

export default ResetPassword;
