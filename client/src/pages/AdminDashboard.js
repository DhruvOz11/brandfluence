import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import { getMediaUrl } from '../utils/mediaUrl';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use(config => {
  const token = getAuthValue('token');
  if (!token) {
    window.location.href = '/admin/login';
    return Promise.reject(new Error('Admin session is missing'));
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('verification');
  const [analytics, setAnalytics] = useState([]);
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [actions, setActions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [decisionReasons, setDecisionReasons] = useState({});
  const [suspensionReasons, setSuspensionReasons] = useState({});
  const [reportReasons, setReportReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAdminData = useCallback(async () => {
    try {
      const [
        analyticsResponse,
        verificationResponse,
        usersResponse,
        reportsResponse,
        actionsResponse
      ] = await Promise.all([
        axiosInstance.get('/collaborations/admin/analytics'),
        axiosInstance.get('/admin/verification-requests'),
        axiosInstance.get('/admin/users'),
        axiosInstance.get('/admin/chat-reports'),
        axiosInstance.get('/admin/moderation-actions')
      ]);
      setAnalytics(analyticsResponse.data.topCreators || []);
      setVerificationRequests(verificationResponse.data.requests || []);
      setUsers(usersResponse.data.users || []);
      setReports(reportsResponse.data.reports || []);
      setActions(actionsResponse.data.actions || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAuthValue('userRole') !== 'admin') {
      clearAuthSession();
      window.location.href = '/admin/login';
      return;
    }
    loadAdminData();
  }, [loadAdminData]);

  const runModerationAction = async (key, action, successMessage) => {
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      await action();
      await loadAdminData();
      setNotice(successMessage);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to complete moderation action.');
    } finally {
      setBusyKey('');
    }
  };

  const reviewVerification = (creator, decision) => {
    const reason = decisionReasons[creator._id] || '';
    return runModerationAction(
      `verification-${creator._id}`,
      () => axiosInstance.put(`/admin/verification-requests/${creator._id}`, {
        decision,
        reason
      }),
      `Verification ${decision.toLowerCase()}.`
    );
  };

  const updateAccountAccess = (user, suspended) => {
    const reason = suspensionReasons[user._id] || '';
    return runModerationAction(
      `account-${user._id}`,
      () => axiosInstance.put(`/admin/users/${user._id}/suspension`, {
        suspended,
        reason
      }),
      suspended ? 'Account suspended.' : 'Account reactivated. The user must sign in again.'
    );
  };

  const reviewReport = (report, status) => {
    const reason = reportReasons[report._id] || '';
    return runModerationAction(
      `report-${report._id}`,
      () => axiosInstance.put(`/admin/chat-reports/${report._id}`, {
        status,
        reason
      }),
      `Report marked ${status.toLowerCase()}.`
    );
  };

  const searchAccounts = async event => {
    event.preventDefault();
    setError('');
    try {
      const response = await axiosInstance.get('/admin/users', {
        params: { search: accountSearch.trim() }
      });
      setUsers(response.data.users || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to search accounts.');
    }
  };

  if (loading) return <main className="admin-dashboard"><p className="loading">Loading admin workspace...</p></main>;

  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Brandfluence operations</p>
          <h1>Admin moderation</h1>
          <p>Review creator verification, account access, and chat reports.</p>
        </div>
        <button type="button" className="admin-refresh-button" onClick={loadAdminData}>
          Refresh data
        </button>
      </header>

      {error && <p className="admin-notice error" role="alert">{error}</p>}
      {notice && <p className="admin-notice success" role="status">{notice}</p>}

      <nav className="admin-tabs" aria-label="Admin sections">
        {[
          ['verification', `Verification (${verificationRequests.length})`],
          ['accounts', 'Accounts'],
          ['reports', `Chat reports (${reports.filter(report => report.status === 'Open').length})`],
          ['activity', 'Activity log'],
          ['analytics', 'Leaderboard']
        ].map(([tab, label]) => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'verification' && (
        <section className="admin-section" aria-labelledby="verification-heading">
          <h2 id="verification-heading">Creator verification requests</h2>
          <p className="admin-section-description">
            Review public profile links and creator-provided context. Never request government identity documents.
          </p>
          {verificationRequests.length === 0 ? (
            <p className="admin-empty">No verification requests need review.</p>
          ) : (
            <div className="admin-card-grid">
              {verificationRequests.map(creator => (
                <article className="admin-card" key={creator._id}>
                  <div className="admin-user-heading">
                    <img src={creator.image || '/default-avatar.png'} alt="" />
                    <div>
                      <h3>{creator.name}</h3>
                      <p>{creator.email}</p>
                      <p>{creator.category} · {creator.city}</p>
                    </div>
                  </div>
                  {creator.instagramProfile && (
                    <p>
                      Public profile:{' '}
                      <a href={creator.instagramProfile} target="_blank" rel="noreferrer">
                        {creator.instagramProfile}
                      </a>
                    </p>
                  )}
                  <p className="admin-evidence">{creator.verificationEvidence}</p>
                  <label htmlFor={`verification-reason-${creator._id}`}>Decision reason</label>
                  <textarea
                    id={`verification-reason-${creator._id}`}
                    value={decisionReasons[creator._id] || ''}
                    onChange={event => setDecisionReasons(current => ({
                      ...current,
                      [creator._id]: event.target.value
                    }))}
                    minLength="10"
                    maxLength="500"
                    placeholder="Explain the approval or what needs improvement (10-500 characters)."
                  />
                  <div className="admin-card-actions">
                    <button
                      type="button"
                      onClick={() => reviewVerification(creator, 'Approved')}
                      disabled={busyKey === `verification-${creator._id}` || (decisionReasons[creator._id] || '').trim().length < 10}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => reviewVerification(creator, 'Rejected')}
                      disabled={busyKey === `verification-${creator._id}` || (decisionReasons[creator._id] || '').trim().length < 10}
                    >
                      Request changes
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'accounts' && (
        <section className="admin-section" aria-labelledby="accounts-heading">
          <h2 id="accounts-heading">Account access</h2>
          <form className="admin-search-form" onSubmit={searchAccounts}>
            <label className="visually-hidden" htmlFor="account-search">Search accounts</label>
            <input
              id="account-search"
              type="search"
              value={accountSearch}
              onChange={event => setAccountSearch(event.target.value)}
              placeholder="Search by name or email"
            />
            <button type="submit">Search</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setAccountSearch('');
                axiosInstance.get('/admin/users').then(response => setUsers(response.data.users || []))
                  .catch(requestError => setError(requestError.response?.data?.error || 'Unable to load accounts.'));
              }}
            >
              Clear
            </button>
          </form>
          {users.length === 0 ? (
            <p className="admin-empty">No accounts found.</p>
          ) : (
            <div className="admin-account-list">
              {users.map(user => (
                <article className="admin-account-row" key={user._id}>
                  <div className="admin-account-identity">
                    <img
                      className={`admin-account-avatar ${user.role === 'brand' ? 'brand' : 'creator'}`}
                      src={getMediaUrl(user.image) || '/default-avatar.png'}
                      alt={user.role === 'brand' ? `${user.name} logo` : `${user.name} profile picture`}
                      onError={event => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/default-avatar.png';
                      }}
                    />
                    <div>
                      <h3>{user.name} <span className="admin-role">{user.role}</span></h3>
                      <p>{user.email}</p>
                      <p>
                        {user.isSuspended
                          ? `Suspended: ${user.suspensionReason || 'No reason recorded'}`
                          : `Verification: ${user.verificationStatus || (user.isVerified ? 'Approved' : 'Not Requested')}`}
                      </p>
                    </div>
                  </div>
                  <div className="admin-account-actions">
                    {user.isSuspended ? (
                      <button
                        type="button"
                        onClick={() => updateAccountAccess(user, false)}
                        disabled={busyKey === `account-${user._id}`}
                      >
                        Reactivate
                      </button>
                    ) : (
                      <>
                        <label className="visually-hidden" htmlFor={`suspension-reason-${user._id}`}>
                          Suspension reason for {user.name}
                        </label>
                        <input
                          id={`suspension-reason-${user._id}`}
                          type="text"
                          value={suspensionReasons[user._id] || ''}
                          onChange={event => setSuspensionReasons(current => ({
                            ...current,
                            [user._id]: event.target.value
                          }))}
                          maxLength="500"
                          placeholder="Reason required (10+ characters)"
                        />
                        <button
                          type="button"
                          className="danger"
                          onClick={() => updateAccountAccess(user, true)}
                          disabled={busyKey === `account-${user._id}` || (suspensionReasons[user._id] || '').trim().length < 10}
                        >
                          Suspend
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="admin-section" aria-labelledby="reports-heading">
          <h2 id="reports-heading">Chat reports</h2>
          {reports.length === 0 ? (
            <p className="admin-empty">No open chat reports.</p>
          ) : (
            <div className="admin-card-grid">
              {reports.map(report => (
                <article className="admin-card" key={report._id}>
                  <div className="admin-report-heading">
                    <h3>{report.status} report</h3>
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <p>
                    <strong>Reported by:</strong>{' '}
                    {report.reporterId?.name || 'Unknown'} ({report.reporterId?.email || 'No email'})
                  </p>
                  <p>
                    <strong>About:</strong>{' '}
                    {report.reportedUserId?.name || 'Unknown'} ({report.reportedUserId?.email || 'No email'})
                  </p>
                  <p><strong>Campaign:</strong> {report.collaborationId?.title || 'Campaign'}</p>
                  <p className="admin-evidence">{report.reason}</p>
                  {report.messageId?.body && (
                    <blockquote className="reported-message">{report.messageId.body}</blockquote>
                  )}
                  {report.status === 'Open' && (
                    <>
                      <label htmlFor={`report-reason-${report._id}`}>Review note</label>
                      <textarea
                        id={`report-reason-${report._id}`}
                        value={reportReasons[report._id] || ''}
                        onChange={event => setReportReasons(current => ({
                          ...current,
                          [report._id]: event.target.value
                        }))}
                        minLength="10"
                        maxLength="500"
                        placeholder="Record your moderation decision (10-500 characters)."
                      />
                      <div className="admin-card-actions">
                        <button
                          type="button"
                          onClick={() => reviewReport(report, 'Reviewed')}
                          disabled={busyKey === `report-${report._id}` || (reportReasons[report._id] || '').trim().length < 10}
                        >
                          Mark reviewed
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => reviewReport(report, 'Dismissed')}
                          disabled={busyKey === `report-${report._id}` || (reportReasons[report._id] || '').trim().length < 10}
                        >
                          Dismiss
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="admin-section" aria-labelledby="activity-heading">
          <h2 id="activity-heading">Moderation activity</h2>
          {actions.length === 0 ? (
            <p className="admin-empty">Moderation decisions will be recorded here.</p>
          ) : (
            <div className="admin-activity-list">
              {actions.map(action => (
                <article key={action._id}>
                  <div>
                    <strong>{action.action.replace(/_/g, ' ')}</strong>
                    <span>{action.subjectType} · {action.subjectId}</span>
                  </div>
                  <p>{action.details}</p>
                  <time dateTime={action.createdAt}>{new Date(action.createdAt).toLocaleString()}</time>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="admin-section admin-analytics" aria-labelledby="analytics-heading">
          <h2 id="analytics-heading">Completed campaign leaderboard</h2>
          {analytics.length === 0 ? (
            <p className="admin-empty">Completed campaign results will appear here. No performance is invented.</p>
          ) : (
            <div className="admin-analytics-table">
              <table>
                <thead>
                  <tr><th>Rank</th><th>Creator</th><th>Completed deals</th><th>Followers</th><th>Recorded revenue</th></tr>
                </thead>
                <tbody>
                  {analytics.map((creator, index) => (
                    <tr key={creator._id}>
                      <td>#{index + 1}</td>
                      <td>{creator.name}</td>
                      <td>{creator.totalDeals}</td>
                      <td>{creator.followers?.toLocaleString() || '0'} (self-reported)</td>
                      <td>${creator.totalRevenue?.toLocaleString() || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default AdminDashboard;
