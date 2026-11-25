import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Signup.css';
import { API_BASE_URL } from '../utils/apiUrl';

const BrandSignup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup/brand`, {
        name,
        email,
        password,
      });
      alert(response.data.message);
    } catch (err) {
      alert(err.response.data.error);
    }
  };

  return (
    <div className="signup-container">
      <h1>Brand Signup</h1>
      <form onSubmit={handleSignup} className="signup-form">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        <button type="submit">Sign Up</button>
        <Link to="/brand/login" className="login-link">
          Already have an account? Login here.
        </Link>
      </form>
    </div>
  );
};

export default BrandSignup;