import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import { getMediaUrl } from '../utils/mediaUrl';
import './CreatorPortfolio.css';

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
      window.location.href = '/creator/login';
    }
    return Promise.reject(error);
  }
);

const profileToForm = profile => ({
  name: profile.name || '',
  description: profile.description || '',
  city: profile.city || '',
  category: profile.category || '',
  charges: profile.charges ?? 0,
  followers: profile.followers ?? 0,
  instagramProfile: profile.instagramProfile || ''
});

const CreatorPortfolio = () => {
  const fileInput = useRef(null);
  const profileImageInput = useRef(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [verificationEvidence, setVerificationEvidence] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyMediaId, setBusyMediaId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/users/creators/me/profile');
      setProfile(response.data);
      setForm(profileToForm(response.data));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load your creator profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateForm = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  };

  const saveProfile = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSavingProfile(true);
    try {
      const response = await axiosInstance.put('/users/creators/me/profile', form);
      setProfile(response.data);
      setForm(profileToForm(response.data));
      setMessage('Your profile has been updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadProfileImage = async event => {
    event.preventDefault();
    if (!profileImageFile) {
      setError('Choose a profile image first.');
      return;
    }
    if (!profileImageFile.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (profileImageFile.size > 5 * 1024 * 1024) {
      setError('Profile images must be 5 MB or smaller.');
      return;
    }

    setError('');
    setMessage('');
    setUploadingProfileImage(true);
    const data = new FormData();
    data.append('image', profileImageFile);

    try {
      const response = await axiosInstance.post('/users/me/profile-image', data);
      setProfile(current => ({ ...current, image: response.data.image }));
      setProfileImageFile(null);
      if (profileImageInput.current) profileImageInput.current.value = '';
      setMessage('Profile picture updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update your profile picture.');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const submitVerificationRequest = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmittingVerification(true);
    try {
      const response = await axiosInstance.post(
        '/users/creators/me/verification-request',
        { evidence: verificationEvidence }
      );
      setProfile(current => ({ ...current, ...response.data }));
      setVerificationEvidence('');
      setMessage('Verification request submitted for admin review.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to submit verification request.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const uploadMedia = async event => {
    event.preventDefault();
    if (!file) {
      setError('Choose an image or video first.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const maxBytes = (isImage ? 10 : 50) * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(isImage ? 'Images must be 10 MB or smaller.' : 'Videos must be 50 MB or smaller.');
      return;
    }

    setError('');
    setMessage('');
    setUploading(true);
    const data = new FormData();
    data.append('media', file);
    data.append('caption', caption);

    try {
      const response = await axiosInstance.post('/users/creators/me/portfolio', data);
      setProfile(current => ({
        ...current,
        portfolio: [...(current.portfolio || []), response.data.portfolioItem]
      }));
      setFile(null);
      setCaption('');
      if (fileInput.current) fileInput.current.value = '';
      setMessage('Portfolio work added.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to upload this portfolio item.');
    } finally {
      setUploading(false);
    }
  };

  const saveCaption = async item => {
    const nextCaption = item.captionDraft ?? item.caption ?? '';
    setError('');
    setMessage('');
    setBusyMediaId(String(item._id));
    try {
      const response = await axiosInstance.patch(
        `/users/creators/me/portfolio/${item._id}`,
        { caption: nextCaption }
      );
      setProfile(current => ({
        ...current,
        portfolio: current.portfolio.map(entry => (
          String(entry._id) === String(item._id)
            ? { ...response.data.portfolioItem, captionDraft: undefined }
            : entry
        ))
      }));
      setMessage('Caption saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to save this caption.');
    } finally {
      setBusyMediaId('');
    }
  };

  const moveMedia = async (itemIndex, offset) => {
    const portfolio = [...(profile.portfolio || [])].sort((a, b) => a.position - b.position);
    const targetIndex = itemIndex + offset;
    if (targetIndex < 0 || targetIndex >= portfolio.length) return;

    [portfolio[itemIndex], portfolio[targetIndex]] = [portfolio[targetIndex], portfolio[itemIndex]];
    setError('');
    setMessage('');
    setBusyMediaId('reorder');
    try {
      const response = await axiosInstance.put('/users/creators/me/portfolio/order', {
        orderedIds: portfolio.map(item => item._id)
      });
      setProfile(current => ({ ...current, portfolio: response.data.portfolio }));
      setMessage('Portfolio order updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to reorder portfolio work.');
    } finally {
      setBusyMediaId('');
    }
  };

  const removeMedia = async item => {
    if (!window.confirm('Remove this item from your portfolio?')) return;
    setError('');
    setMessage('');
    setBusyMediaId(String(item._id));
    try {
      await axiosInstance.delete(`/users/creators/me/portfolio/${item._id}`);
      setProfile(current => ({
        ...current,
        portfolio: current.portfolio.filter(entry => String(entry._id) !== String(item._id))
      }));
      setMessage('Portfolio item removed.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to remove this portfolio item.');
    } finally {
      setBusyMediaId('');
    }
  };

  if (loading) {
    return <main className="creator-portfolio-page"><p role="status">Loading your profile...</p></main>;
  }

  if (!profile || !form) {
    return (
      <main className="creator-portfolio-page">
        <p className="portfolio-error" role="alert">{error || 'Creator profile not found.'}</p>
        <Link to="/creator/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  const portfolio = [...(profile.portfolio || [])]
    .sort((first, second) => first.position - second.position);

  return (
    <main className="creator-portfolio-page">
      <header className="creator-portfolio-header">
        <div>
          <p className="portfolio-eyebrow">Creator workspace</p>
          <h1>My profile and portfolio</h1>
          <p>Show brands who you are and the work you are proud of.</p>
        </div>
        <Link to="/creator/dashboard" className="portfolio-back-link">Back to dashboard</Link>
      </header>

      {message && <p className="portfolio-message success" role="status">{message}</p>}
      {error && <p className="portfolio-message error" role="alert">{error}</p>}

      <section className="portfolio-panel">
        <h2>Public profile</h2>
        <div className="profile-image-editor">
          <img
            src={getMediaUrl(profile.image) || '/default-avatar.png'}
            alt={`${profile.name}'s profile`}
            onError={event => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/default-avatar.png';
            }}
          />
          <form onSubmit={uploadProfileImage}>
            <h3>Profile picture</h3>
            <p>JPG, PNG, or WebP; maximum 5 MB.</p>
            <label>
              Choose a picture
              <input
                ref={profileImageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={event => setProfileImageFile(event.target.files?.[0] || null)}
              />
            </label>
            <button type="submit" disabled={uploadingProfileImage || !profileImageFile}>
              {uploadingProfileImage ? 'Uploading...' : 'Update picture'}
            </button>
          </form>
        </div>
        <form className="creator-profile-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input name="name" value={form.name} onChange={updateForm} minLength="2" maxLength="80" required />
          </label>
          <label>
            Bio
            <textarea name="description" value={form.description} onChange={updateForm} maxLength="1000" rows="4" required />
            <small>{form.description.length}/1000 characters</small>
          </label>
          <div className="portfolio-form-row">
            <label>
              City
              <input name="city" value={form.city} onChange={updateForm} maxLength="100" required />
            </label>
            <label>
              Category
              <input name="category" value={form.category} onChange={updateForm} maxLength="50" required />
            </label>
          </div>
          <div className="portfolio-form-row">
            <label>
              Rate per post ($)
              <input name="charges" type="number" min="0" step="0.01" value={form.charges} onChange={updateForm} required />
            </label>
            <label>
              Followers (self-reported)
              <input name="followers" type="number" min="0" step="1" value={form.followers} onChange={updateForm} required />
            </label>
          </div>
          <label>
            Instagram profile URL
            <input
              name="instagramProfile"
              type="url"
              value={form.instagramProfile}
              onChange={updateForm}
              maxLength="300"
              placeholder="https://www.instagram.com/yourname"
            />
          </label>
          <button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="portfolio-panel verification-panel">
        <div className="portfolio-section-heading">
          <div>
            <h2>Platform verification</h2>
            <p>Share public evidence that helps the team confirm your creator presence. Do not upload identity documents.</p>
          </div>
          <span className={`verification-status ${profile.isVerified || profile.verificationStatus === 'Approved' ? 'approved' : ''}`}>
            {profile.isVerified ? 'Approved' : (profile.verificationStatus || 'Not Requested')}
          </span>
        </div>
        {profile.verificationDecisionReason && (
          <p className="verification-decision-reason">
            Admin decision: {profile.verificationDecisionReason}
          </p>
        )}
        {!profile.isVerified
          && profile.verificationStatus !== 'Pending'
          && profile.verificationStatus !== 'Approved'
          && (
          <form className="verification-request-form" onSubmit={submitVerificationRequest}>
            <label htmlFor="verification-evidence">
              Verification evidence (public profile links or a short explanation)
            </label>
            <textarea
              id="verification-evidence"
              value={verificationEvidence}
              onChange={event => setVerificationEvidence(event.target.value)}
              minLength="10"
              maxLength="1000"
              placeholder="For example, link your public creator profile and explain how it matches this account."
              required
            />
            <button type="submit" disabled={submittingVerification || verificationEvidence.trim().length < 10}>
              {submittingVerification ? 'Submitting...' : 'Request verification'}
            </button>
          </form>
        )}
      </section>

      <section className="portfolio-panel">
        <div className="portfolio-section-heading">
          <div>
            <h2>Portfolio work</h2>
            <p>Add up to 12 images or videos. Images: 10 MB max; videos: 50 MB max.</p>
          </div>
          <span>{portfolio.length}/12</span>
        </div>

        <form className="portfolio-upload-form" onSubmit={uploadMedia}>
          <label>
            Choose an image or video
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={event => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <label>
            Caption (optional)
            <input
              type="text"
              value={caption}
              onChange={event => setCaption(event.target.value)}
              maxLength="200"
              placeholder="Tell brands about this work"
            />
          </label>
          <button type="submit" disabled={uploading || portfolio.length >= 12}>
            {uploading ? 'Uploading...' : 'Add to portfolio'}
          </button>
        </form>

        {portfolio.length === 0 ? (
          <p className="portfolio-empty">Your portfolio is empty. Add a few examples of your work to help brands get to know you.</p>
        ) : (
          <div className="creator-manage-grid">
            {portfolio.map((item, index) => (
              <article className="creator-manage-card" key={item._id}>
                {item.mediaType === 'video' ? (
                  <video src={getMediaUrl(item.filename)} controls preload="metadata" playsInline />
                ) : (
                  <img src={getMediaUrl(item.filename)} alt={item.caption || 'Portfolio work'} loading="lazy" />
                )}
                <label>
                  Caption
                  <input
                    type="text"
                    maxLength="200"
                    value={item.captionDraft ?? item.caption ?? ''}
                    onChange={event => {
                      const captionDraft = event.target.value;
                      setProfile(current => ({
                        ...current,
                        portfolio: current.portfolio.map(entry => (
                          String(entry._id) === String(item._id)
                            ? { ...entry, captionDraft }
                            : entry
                        ))
                      }));
                    }}
                  />
                </label>
                <div className="portfolio-item-actions">
                  <button type="button" onClick={() => moveMedia(index, -1)} disabled={index === 0 || busyMediaId === 'reorder'}>
                    Move up
                  </button>
                  <button type="button" onClick={() => moveMedia(index, 1)} disabled={index === portfolio.length - 1 || busyMediaId === 'reorder'}>
                    Move down
                  </button>
                  <button type="button" onClick={() => saveCaption(item)} disabled={busyMediaId === String(item._id)}>
                    Save caption
                  </button>
                  <button type="button" className="remove-portfolio-button" onClick={() => removeMedia(item)} disabled={busyMediaId === String(item._id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default CreatorPortfolio;
