import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import { getMediaUrl } from '../utils/mediaUrl';
import './CreatorProfile.css';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL
});

axiosInstance.interceptors.request.use(config => {
  const token = getAuthValue('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.href = '/brand/login';
    }
    return Promise.reject(error);
  }
);

const CreatorProfile = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axiosInstance.get(`/users/creators/${creatorId}`);
        setCreator(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Unable to load this creator profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [creatorId]);

  if (loading) {
    return <main className="creator-profile-page"><p role="status">Loading creator profile...</p></main>;
  }

  if (error || !creator) {
    return (
      <main className="creator-profile-page">
        <p className="profile-error" role="alert">{error || 'Creator profile not found.'}</p>
        <Link to="/brand/dashboard">Back to creator search</Link>
      </main>
    );
  }

  const portfolio = [...(creator.portfolio || [])]
    .sort((first, second) => first.position - second.position);

  return (
    <main className="creator-profile-page">
      <Link to="/brand/dashboard" className="profile-back-link">Back to creators</Link>
      <section className="creator-profile-hero">
        <img
          className="creator-profile-avatar"
          src={getMediaUrl(creator.image) || '/default-avatar.png'}
          alt={`${creator.name}'s profile`}
          onError={event => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/default-avatar.png';
          }}
        />
        <div className="creator-profile-summary">
          <p className="profile-eyebrow">{creator.category || 'Creator'}</p>
          <h1>{creator.name}</h1>
          <span className={`creator-verification-badge ${creator.isVerified ? 'verified' : 'unverified'}`}>
            {creator.isVerified ? 'Platform verified' : 'Not platform verified'}
          </span>
          <p className="creator-profile-location">{creator.city || 'Location not specified'}</p>
          <p className="creator-profile-bio">{creator.description || 'This creator has not added a bio yet.'}</p>
          <div className="creator-profile-stats">
            <span><strong>{(creator.followers || 0).toLocaleString()}</strong> followers</span>
            <span><strong>${(creator.charges || 0).toLocaleString()}</strong> per post</span>
          </div>
          <p className="self-reported-note">
            Audience figures are self-reported. Verification is reviewed by the platform.
          </p>
          <button
            type="button"
            className="profile-collaborate-button"
            onClick={() => navigate('/brand/dashboard', { state: { creatorId: creator._id } })}
          >
            Start collaboration
          </button>
        </div>
      </section>

      <section className="creator-portfolio-section" aria-labelledby="portfolio-title">
        <div className="portfolio-heading">
          <div>
            <p className="profile-eyebrow">Selected work</p>
            <h2 id="portfolio-title">Creator portfolio</h2>
          </div>
          <span>{portfolio.length} {portfolio.length === 1 ? 'piece' : 'pieces'}</span>
        </div>

        {portfolio.length === 0 ? (
          <p className="portfolio-empty">This creator has not added portfolio work yet.</p>
        ) : (
          <div className="creator-portfolio-grid">
            {portfolio.map(item => (
              <figure className="creator-portfolio-item" key={item._id}>
                {item.mediaType === 'video' ? (
                  <video
                    src={getMediaUrl(item.filename)}
                    controls
                    preload="metadata"
                    playsInline
                    aria-label={item.caption || `${creator.name}'s portfolio video`}
                  />
                ) : (
                  <img
                    src={getMediaUrl(item.filename)}
                    alt={item.caption || `${creator.name}'s portfolio work`}
                    loading="lazy"
                  />
                )}
                {item.caption && <figcaption>{item.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default CreatorProfile;
