import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import AccountMenu from '../components/AccountMenu';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
      window.location.href = '/creator/login';
    }
    return Promise.reject(error);
  }
);

const formatDate = date => date
  ? new Date(date).toLocaleDateString()
  : 'Not set';

const getStatusClass = status => status.toLowerCase().replace(/\s+/g, '-');

const CreatorDashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campaignError, setCampaignError] = useState('');
  const [busyCampaignId, setBusyCampaignId] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState({});

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axiosInstance.get('/collaborations/creator');
        setCampaigns(response.data);
      } catch (err) {
        setCampaignError(err.response?.data?.error || 'Unable to load your campaigns.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleStatusUpdate = async (campaignId, status) => {
    setCampaignError('');
    setBusyCampaignId(campaignId);
    try {
      const response = await axiosInstance.put(
        `/collaborations/${campaignId}/status`,
        {
          status,
          ...(status === 'Submitted' && { submissionNote: submissionNotes[campaignId] || '' })
        }
      );
      setCampaigns(current => current.map(campaign => (
        campaign._id === campaignId ? response.data.collaboration : campaign
      )));
      setSubmissionNotes(current => {
        const next = { ...current };
        delete next[campaignId];
        return next;
      });
    } catch (err) {
      setCampaignError(err.response?.data?.error || 'Unable to update campaign status.');
    } finally {
      setBusyCampaignId('');
    }
  };

  return (
    <div className="dashboard-container creator-dashboard">
      <header className="creator-dashboard-header">
        <div>
          <h1>Creator Dashboard</h1>
          <p>Review campaign requests and keep your active work moving.</p>
        </div>
        <nav className="creator-dashboard-links" aria-label="Creator tools">
          <Link to="/creator/portfolio" className="manage-portfolio-link">
            Manage my profile and portfolio
          </Link>
          <Link to="/creator/chat" className="manage-portfolio-link">Chat</Link>
          <AccountMenu role="creator" />
        </nav>
      </header>

      <section aria-labelledby="campaigns-heading">
        <h2 id="campaigns-heading">My campaigns</h2>
        {campaignError && <p className="campaign-message error" role="alert">{campaignError}</p>}
        {loading ? (
          <p role="status">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="campaign-empty-state">No campaign requests yet. New requests will appear here.</p>
        ) : (
          <div className="collaboration-list">
            {campaigns.map(campaign => (
              <article key={campaign._id} className={`collab-card ${getStatusClass(campaign.status)}`}>
                <header className="creator-campaign-header">
                  <div>
                    <p className="creator-campaign-brand">From {campaign.brandId?.name || 'Unknown brand'}</p>
                    <h3>{campaign.title || 'Campaign'}</h3>
                  </div>
                  <span className={`status-badge ${getStatusClass(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </header>

                <p><strong>Brief:</strong> {campaign.purpose}</p>
                <p><strong>Deliverables:</strong> {campaign.deliverables}</p>
                <div className="creator-campaign-meta">
                  <p>
                    <strong>Budget:</strong>{' '}
                    ${Number(campaign.budget || campaign.charges || 0).toLocaleString()}
                  </p>
                  <p>
                    <strong>Due date:</strong>{' '}
                    {campaign.dueDate ? formatDate(campaign.dueDate) : (campaign.timeLimit || 'Not set')}
                  </p>
                </div>

                {campaign.submissionNote && (
                  <p className="campaign-submission-note">
                    <strong>Your submission:</strong> {campaign.submissionNote}
                  </p>
                )}

                {campaign.statusHistory?.length > 0 && (
                  <ol className="campaign-timeline">
                    {campaign.statusHistory.map((item, index) => (
                      <li key={`${item.status}-${item.createdAt}-${index}`}>
                        <strong>{item.status}</strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {campaign.status === 'Pending' && (
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="accept-btn"
                      onClick={() => handleStatusUpdate(campaign._id, 'Accepted')}
                      disabled={busyCampaignId === campaign._id}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="reject-btn"
                      onClick={() => handleStatusUpdate(campaign._id, 'Rejected')}
                      disabled={busyCampaignId === campaign._id}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {campaign.status === 'In Progress' && (
                  <div className="submission-form">
                    <label htmlFor={`submission-note-${campaign._id}`}>Work submission note</label>
                    <textarea
                      id={`submission-note-${campaign._id}`}
                      value={submissionNotes[campaign._id] || ''}
                      onChange={event => setSubmissionNotes(current => ({
                        ...current,
                        [campaign._id]: event.target.value
                      }))}
                      minLength="3"
                      maxLength="1000"
                      placeholder="Describe the work you have completed or link the delivered content."
                    />
                    <button
                      type="button"
                      className="submit-work-btn"
                      onClick={() => handleStatusUpdate(campaign._id, 'Submitted')}
                      disabled={
                        busyCampaignId === campaign._id
                        || (submissionNotes[campaign._id] || '').trim().length < 3
                      }
                    >
                      {busyCampaignId === campaign._id ? 'Submitting...' : 'Submit work'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CreatorDashboard;
