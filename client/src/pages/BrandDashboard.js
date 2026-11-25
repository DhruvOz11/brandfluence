import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './BrandDashboard.css';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import { getMediaUrl } from '../utils/mediaUrl';
import AccountMenu from '../components/AccountMenu';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

const CATEGORIES = [
  { name: 'Fashion', color: '#FF6B6B' },
  { name: 'Tech', color: '#4ECDC4' },
  { name: 'Food', color: '#45B7D1' },
  { name: 'Travel', color: '#96CEB4' },
  { name: 'Lifestyle', color: '#A78BFA' },
  { name: 'Fitness', color: '#FFEEAD' },
  { name: 'Beauty', color: '#D4A5A5' },
];

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

const BrandDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    maxRate: 10000,
    minFollowers: 0
  });
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [collabDetails, setCollabDetails] = useState({
    title: '',
    purpose: '',
    deliverables: '',
    budget: '',
    dueDate: '',
  });
  const [requestingCollaboration, setRequestingCollaboration] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [busyCampaignId, setBusyCampaignId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [creatorsRes, collabsRes] = await Promise.all([
          axiosInstance.get('/users/creators', { params: filters }),
          axiosInstance.get('/collaborations/brand')
        ]);
        setCreators(creatorsRes.data);
        setCollaborations(collabsRes.data);
      } catch (err) {
        console.error('Error:', err.response?.data?.error || err.message);
      }
    };
    fetchData();
  }, [filters]);

  useEffect(() => {
    const creatorId = location.state?.creatorId;
    if (creatorId && creators.some(creator => creator._id === creatorId)) {
      setSelectedCreator(creatorId);
      navigate('/brand/dashboard', { replace: true, state: null });
    }
  }, [creators, location.state, navigate]);

  const handleCollabRequest = creatorId => {
    const creator = creators.find(item => item._id === creatorId);
    setCollabDetails({
      title: '',
      purpose: '',
      deliverables: '',
      budget: creator?.charges || '',
      dueDate: ''
    });
    setCampaignError('');
    setSelectedCreator(creatorId);
  };

  const sendCollabRequest = async event => {
    event.preventDefault();
    setCampaignError('');
    setRequestingCollaboration(true);
    try {
      await axiosInstance.post('/collaborations/request', {
        creatorId: selectedCreator,
        title: collabDetails.title,
        purpose: collabDetails.purpose,
        deliverables: collabDetails.deliverables,
        budget: Number(collabDetails.budget),
        dueDate: collabDetails.dueDate
      });
      setSelectedCreator(null);
      setCollabDetails({
        title: '',
        purpose: '',
        deliverables: '',
        budget: '',
        dueDate: ''
      });

      try {
        const collabsRes = await axiosInstance.get('/collaborations/brand');
        setCollaborations(collabsRes.data);
      } catch {
        setCampaignError('Campaign request sent, but the campaign list could not refresh. Reload to see it.');
      }
    } catch (err) {
      setCampaignError(err.response?.data?.error || 'Unable to send campaign request.');
    } finally {
      setRequestingCollaboration(false);
    }
  };

  const updateCampaignStatus = async (collaborationId, status) => {
    setCampaignError('');
    setBusyCampaignId(collaborationId);
    try {
      const response = await axiosInstance.put(
        `/collaborations/${collaborationId}/status`,
        { status }
      );
      setCollaborations(current => current.map(collaboration => (
        collaboration._id === collaborationId
          ? response.data.collaboration
          : collaboration
      )));
    } catch (err) {
      setCampaignError(err.response?.data?.error || 'Unable to update campaign status.');
    } finally {
      setBusyCampaignId('');
    }
  };

  const formatDate = date => date
    ? new Date(date).toLocaleDateString()
    : 'Not set';
  const getStatusClass = status => status.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="dashboard-container rainbow-background">
      <header className="brand-dashboard-header">
        <h1 className="dashboard-title">Brand Dashboard</h1>
        <nav className="brand-dashboard-actions" aria-label="Brand account">
          <Link to="/brand/chat" className="brand-chat-link">Campaign chat</Link>
          <AccountMenu role="brand" />
        </nav>
      </header>

      {/* Enhanced Filters Section */}
      <div className="filters-container">
        {/* Category Filter Buttons */}
        <div className="category-filter">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className={`category-btn ${filters.category === cat.name ? 'active' : ''}`}
              style={{ backgroundColor: cat.color }}
              onClick={() => setFilters(prev => ({
                ...prev,
                category: prev.category === cat.name ? '' : cat.name
              }))}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* City Search */}
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search City..."
            className="city-search"
            value={filters.city}
            onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
          />
        </div>

        {/* Rate & Followers Sliders */}
        <div className="slider-group">
          <div className="slider-container">
            <label>Max Rate: ${Number(filters.maxRate).toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={filters.maxRate}
              onChange={e => setFilters(prev => ({ ...prev, maxRate: Number(e.target.value) }))}
            />
          </div>
          <div className="slider-container">
            <label>Min Followers: {Number(filters.minFollowers).toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="1000000"
              value={filters.minFollowers}
              onChange={e => setFilters(prev => ({ ...prev, minFollowers: Number(e.target.value) }))}
            />
          </div>
          <button
            type="button"
            className="clear-filters-btn"
            onClick={() => setFilters({
              category: '',
              city: '',
              maxRate: 10000,
              minFollowers: 0
            })}
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Creators Grid */}
      <h2 className="section-title">Featured Creators</h2>
      <div className="creator-grid">
        {creators.map(creator => (
          <div key={creator._id} className="creator-card">
            <div className="card-header">
              <Link to={`/creators/${creator._id}`} className="creator-profile-link">
                <img
                  src={getMediaUrl(creator.image) || '/default-avatar.png'}
                  alt={`${creator.name}'s profile`}
                  className="creator-avatar"
                  onError={event => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/default-avatar.png';
                  }}
                />
                <div className="creator-meta">
                  <h3>{creator.name}</h3>
                  <div className="stats">
                    <span className="followers">👥 {creator.followers?.toLocaleString() || '0'}</span>
                    <span className="rate">💵 ${creator.charges}/post</span>
                  </div>
                  <div className="location">
                    📍 {creator.city || 'Unknown'} | {creator.category || 'General'}
                  </div>
                  <span className={`creator-verification-badge ${creator.isVerified ? 'verified' : 'unverified'}`}>
                    {creator.isVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
              </Link>
              <Link to={`/creators/${creator._id}`} className="view-profile-link">
                View profile and work
              </Link>
            </div>
            <button
              className="collab-btn"
              onClick={() => handleCollabRequest(creator._id)}
            >
              Start Collaboration
            </button>
          </div>
        ))}
      </div>

      {/* Collaborations Section */}
      <h2 className="section-title">Campaigns</h2>
      {campaignError && !selectedCreator && (
        <p className="campaign-message error" role="alert">{campaignError}</p>
      )}
      <div className="collaboration-grid">
        {collaborations.length === 0 ? (
          <p className="no-collabs">No active collaborations found</p>
        ) : (
          collaborations.map(collab => (
            <div key={collab._id} className={`collab-card ${getStatusClass(collab.status)}`}>
              <div className="collab-header">
                <h3>
                  Collab with {collab.creatorId?.name || 'Unknown Creator'}
                  <img
                    src={getMediaUrl(collab.creatorId?.image) || '/default-avatar.png'}
                    alt="Creator"
                    className="creator-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                </h3>
                <span className={`status-badge ${getStatusClass(collab.status)}`}>
                  {collab.status}
                </span>
              </div>
              <div className="collab-content">
                <h4>{collab.title || 'Campaign'}</h4>
                <p className="collab-description">{collab.purpose}</p>
                <div className="collab-meta">
                  <div className="meta-item">
                    <span className="meta-label">Deliverables:</span>
                    <span className="meta-value">{collab.deliverables}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Budget:</span>
                    <span className="meta-value">
                      ${(collab.budget || collab.charges || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Due date:</span>
                    <span className="meta-value">
                      {collab.dueDate ? formatDate(collab.dueDate) : (collab.timeLimit || 'Not set')}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Requested:</span>
                    <span className="meta-value">
                      {new Date(collab.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {collab.submissionNote && (
                  <p className="campaign-submission-note">
                    Creator submission: {collab.submissionNote}
                  </p>
                )}
                {collab.statusHistory?.length > 0 && (
                  <ol className="campaign-timeline">
                    {collab.statusHistory.map((item, index) => (
                      <li key={`${item.status}-${item.createdAt}-${index}`}>
                        <strong>{item.status}</strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {collab.status === 'Accepted' && (
                  <button
                    type="button"
                    className="campaign-next-action"
                    onClick={() => updateCampaignStatus(collab._id, 'In Progress')}
                    disabled={busyCampaignId === collab._id}
                  >
                    {busyCampaignId === collab._id ? 'Updating...' : 'Start campaign'}
                  </button>
                )}
                {collab.status === 'Submitted' && (
                  <button
                    type="button"
                    className="campaign-next-action"
                    onClick={() => updateCampaignStatus(collab._id, 'Completed')}
                    disabled={busyCampaignId === collab._id}
                  >
                    {busyCampaignId === collab._id ? 'Updating...' : 'Confirm completion'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enhanced Collab Modal */}
      {selectedCreator && (
        <div className="modal-overlay">
          <form className="collab-modal" onSubmit={sendCollabRequest}>
            <h2>New Collaboration Request</h2>
            <div className="form-group">
              <label htmlFor="campaign-title">Campaign title</label>
              <input
                id="campaign-title"
                type="text"
                minLength="3"
                maxLength="100"
                value={collabDetails.title}
                onChange={e => setCollabDetails(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Summer product launch"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="campaign-purpose">Campaign brief</label>
              <textarea
                id="campaign-purpose"
                value={collabDetails.purpose}
                onChange={e => setCollabDetails(prev => ({ ...prev, purpose: e.target.value }))}
                minLength="10"
                maxLength="2000"
                placeholder="Describe your campaign goals and product..."
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="campaign-deliverables">Deliverables</label>
              <textarea
                id="campaign-deliverables"
                value={collabDetails.deliverables}
                onChange={e => setCollabDetails(prev => ({ ...prev, deliverables: e.target.value }))}
                minLength="3"
                maxLength="2000"
                placeholder="For example: one Reel and two story posts"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="campaign-budget">Campaign budget ($)</label>
              <input
                id="campaign-budget"
                type="number"
                min="1"
                step="0.01"
                value={collabDetails.budget}
                onChange={e => setCollabDetails(prev => ({ ...prev, budget: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="campaign-due-date">Expected completion date</label>
              <input
                id="campaign-due-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={collabDetails.dueDate}
                onChange={e => setCollabDetails(prev => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>
            {campaignError && <p className="campaign-message error" role="alert">{campaignError}</p>}
            <div className="modal-actions">
              <button className="submit-btn" type="submit" disabled={requestingCollaboration}>
                {requestingCollaboration ? 'Sending...' : 'Send campaign request'}
              </button>
              <button className="cancel-btn" type="button" onClick={() => setSelectedCreator(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BrandDashboard;