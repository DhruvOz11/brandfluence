import React, { useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import './Login.css';
import { API_BASE_URL } from '../utils/apiUrl';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const loginRole = requestedRole === 'creator' ? 'creator' : 'brand';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/password/forgot`,
        { email }
      );
      setMessage(response.data.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error
        || 'Unable to request a reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Reset your password</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="reset-email">Account email</label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />
        {message && <p className="auth-message success" role="status">{message}</p>}
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <Link to={`/${loginRole}/login`} className="auth-link">Back to login</Link>
      </form>
    </div>
  );
};

export default ForgotPassword;
