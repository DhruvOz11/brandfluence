import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import { getMediaUrl } from '../utils/mediaUrl';
import './AccountMenu.css';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL
});

axiosInstance.interceptors.request.use(config => {
  const token = getAuthValue('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AccountMenu = ({ role }) => {
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await axiosInstance.get('/users/me/profile');
        setProfile(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Unable to load your profile picture.');
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const uploadProfilePicture = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!selectedFile) {
      setError('Choose a profile picture first.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Profile pictures must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('image', selectedFile);

    try {
      const response = await axiosInstance.post('/users/me/profile-image', data);
      setProfile(current => ({ ...current, ...response.data }));
      setImageFailed(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('Profile picture updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update your profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const logOut = () => {
    clearAuthSession();
    navigate(`/${role}/login`, { replace: true });
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className={`account-menu-trigger ${role === 'brand' ? 'brand' : 'creator'}`}
        aria-label="Open account menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        {profile?.image && !imageFailed ? (
          <img
            src={getMediaUrl(profile.image)}
            alt=""
            onError={() => setImageFailed(true)}
          />
        ) : (
          <FaUserCircle aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="account-menu-panel">
          <form onSubmit={uploadProfilePicture}>
            <label htmlFor={`account-picture-${role}`}>Profile picture</label>
            <input
              ref={fileInputRef}
              id={`account-picture-${role}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                setSelectedFile(event.target.files?.[0] || null);
                setError('');
                setMessage('');
              }}
            />
            <small>JPG, PNG, or WebP · up to 5 MB</small>
            {error && <p className="account-menu-error" role="alert">{error}</p>}
            {message && <p className="account-menu-success" role="status">{message}</p>}
            <button type="submit" disabled={uploading || !selectedFile}>
              {uploading ? 'Uploading...' : 'Upload picture'}
            </button>
          </form>
          <button type="button" className="account-menu-logout" onClick={logOut}>
            <FaSignOutAlt aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
