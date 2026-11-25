import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Signup.css'; 
import { API_BASE_URL } from '../utils/apiUrl';

const CreatorSignup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instagramProfile, setInstagramProfile] = useState('');
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [charges, setCharges] = useState('');
  const [city, setCity] = useState(''); 
  const [category, setCategory] = useState(''); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('instagramProfile', instagramProfile);
    formData.append('image', image);
    formData.append('description', description);
    formData.append('charges', charges);
    formData.append('city', city); 
    formData.append('category', category); 

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup/creator`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(response.data.message);
    } catch (err) {
      alert(
        err.response?.data?.error
        || 'Unable to reach the server. Please try again later.'
      );
    }
  };

  return (
    <div className="signup-container">
      <h1>Creator Signup</h1>
      <form onSubmit={handleSubmit} className="signup-form">
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
        <input
          type="text"
          placeholder="Instagram Profile Link"
          value={instagramProfile}
          onChange={(e) => setInstagramProfile(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>
          <option value="Fashion">Fashion</option>
          <option value="Lifestyle">Lifestyle</option>
          <option value="Travel">Travel</option>
          <option value="Food">Food</option>
          <option value="Fitness">Fitness</option>
          <option value="Tech">Tech</option>
          <option value="Beauty">Beauty</option>
        </select>
        <input type="file" onChange={(e) => setImage(e.target.files[0])} required />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Charges per Post"
          value={charges}
          onChange={(e) => setCharges(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
        <Link to="/creator/login" className="login-link">
          Already have an account? Login here.
        </Link>
      </form>
    </div>
  );
};

export default CreatorSignup;