import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { clearAuthSession, getAuthValue } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiUrl';
import { getMediaUrl } from '../utils/mediaUrl';
import './ChatPage.css';

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
      const currentRole = getAuthValue('userRole');
      clearAuthSession();
      window.location.href = currentRole === 'brand' ? '/brand/login' : '/creator/login';
    }
    return Promise.reject(error);
  }
);

const formatTime = date => date
  ? new Date(date).toLocaleString()
  : '';

const ParticipantAvatar = ({ image, name, className = '' }) => (
  <img
    className={className}
    src={getMediaUrl(image) || '/default-avatar.png'}
    alt={`${name || 'Participant'}'s avatar`}
    onError={event => {
      event.currentTarget.onerror = null;
      event.currentTarget.src = '/default-avatar.png';
    }}
  />
);

const ChatPage = () => {
  const role = getAuthValue('userRole');
  const dashboardPath = role === 'brand' ? '/brand/dashboard' : '/creator/dashboard';
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [draft, setDraft] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const messageListRef = useRef(null);
  const messageRequestIdRef = useRef(0);
  const previousLastMessageIdRef = useRef('');
  const shouldAutoScrollRef = useRef(true);

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConversations(true);
    try {
      const response = await axiosInstance.get('/chat/conversations');
      const nextConversations = response.data.conversations;
      setConversations(nextConversations);
      setSelectedId(current => (
        nextConversations.some(item => item.collaborationId === current)
          ? current
          : (nextConversations[0]?.collaborationId || '')
      ));
      if (!silent) setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load conversations.');
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (collaborationId, silent = false) => {
    if (!collaborationId) return;
    const requestId = ++messageRequestIdRef.current;
    if (!silent) setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(
        `/chat/conversations/${collaborationId}/messages`
      );
      if (requestId === messageRequestIdRef.current) {
        setMessages(response.data.messages);
        if (!silent) setError('');
      }
    } catch (requestError) {
      if (requestId === messageRequestIdRef.current) {
        setError(requestError.response?.data?.error || 'Unable to load messages.');
      }
    } finally {
      if (!silent && requestId === messageRequestIdRef.current) {
        setLoadingMessages(false);
      }
    }
  }, []);

  useEffect(() => {
    const loadMyProfile = async () => {
      try {
        const response = await axiosInstance.get('/users/me/profile');
        setMyProfile(response.data);
      } catch (requestError) {
        setMyProfile(null);
        setError(requestError.response?.data?.error || 'Unable to load your profile picture.');
      }
    };
    loadMyProfile();
  }, []);

  useEffect(() => {
    loadConversations();
    const intervalId = window.setInterval(() => loadConversations(true), 7000);
    return () => window.clearInterval(intervalId);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      messageRequestIdRef.current += 1;
      setMessages([]);
      setLoadingMessages(false);
      return undefined;
    }

    setMessages([]);
    previousLastMessageIdRef.current = '';
    shouldAutoScrollRef.current = true;
    loadMessages(selectedId);
    const intervalId = window.setInterval(() => loadMessages(selectedId, true), 5000);
    return () => window.clearInterval(intervalId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const messageList = messageListRef.current;
    const lastMessageId = messages[messages.length - 1]?._id || '';
    if (
      messageList
      && lastMessageId !== previousLastMessageIdRef.current
      && shouldAutoScrollRef.current
    ) {
      messageList.scrollTop = messageList.scrollHeight;
    }
    previousLastMessageIdRef.current = lastMessageId;
  }, [messages]);

  const selectedConversation = conversations.find(
    conversation => conversation.collaborationId === selectedId
  );
  const blockState = selectedConversation?.blockState || {
    youBlocked: false,
    otherBlocked: false
  };
  const chatIsBlocked = blockState.youBlocked || blockState.otherBlocked;

  const sendMessage = async event => {
    event.preventDefault();
    if (!selectedId || !draft.trim() || chatIsBlocked) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await axiosInstance.post(
        `/chat/conversations/${selectedId}/messages`,
        { body: draft }
      );
      setMessages(current => [...current, response.data.message]);
      setDraft('');
      await loadConversations(true);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axiosInstance.put(`/chat/conversations/${selectedId}/block`, {
        blocked: !blockState.youBlocked
      });
      await loadConversations(true);
      setNotice(blockState.youBlocked
        ? 'You unblocked this chat.'
        : 'You blocked this chat. The conversation remains available as read-only.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update block settings.');
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async event => {
    event.preventDefault();
    if (!selectedId || reportReason.trim().length < 10) return;

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axiosInstance.post(`/chat/conversations/${selectedId}/reports`, {
        reason: reportReason
      });
      setReportReason('');
      setReporting(false);
      setNotice('Report submitted for review.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to submit report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="chat-page">
      <header className="chat-page-header">
        <div>
          <p className="chat-eyebrow">Brandfluence messages</p>
          <h1>Campaign chat</h1>
          <p>Talk directly with the other participant in each campaign.</p>
        </div>
        <Link to={dashboardPath} className="chat-back-link">Back to dashboard</Link>
      </header>

      {error && <p className="chat-alert error" role="alert">{error}</p>}
      {notice && <p className="chat-alert success" role="status">{notice}</p>}

      <div className="chat-layout">
        <aside className="chat-inbox" aria-label="Campaign conversations">
          <h2>Conversations</h2>
          {loadingConversations ? (
            <p className="chat-empty">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="chat-empty">Campaign conversations will appear here.</p>
          ) : (
            <ul>
              {conversations.map(conversation => (
                <li key={conversation.collaborationId}>
                  <button
                    type="button"
                    className={`chat-conversation ${selectedId === conversation.collaborationId ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedId(conversation.collaborationId);
                      setReporting(false);
                      setReportReason('');
                      setError('');
                      setNotice('');
                    }}
                  >
                    <ParticipantAvatar
                      className="chat-conversation-avatar"
                      image={conversation.partner.image}
                      name={conversation.partner.name}
                    />
                    <span className="chat-conversation-details">
                      <span className="chat-conversation-topline">
                        <strong>{conversation.partner.name}</strong>
                        {conversation.unreadCount > 0 && (
                          <span className="chat-unread-count" aria-label={`${conversation.unreadCount} unread messages`}>
                            {conversation.unreadCount}
                          </span>
                        )}
                      </span>
                      <span className="chat-campaign-title">{conversation.title}</span>
                      <span className="chat-last-message">
                        {conversation.lastMessage
                          ? `${conversation.lastMessage.isMine ? 'You: ' : ''}${conversation.lastMessage.body}`
                          : 'No messages yet'}
                      </span>
                      <span className="chat-campaign-status">{conversation.campaignStatus}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="chat-conversation-panel" aria-label="Selected conversation">
          {!selectedConversation ? (
            <div className="chat-empty chat-panel-empty">
              Select a campaign conversation to start chatting.
            </div>
          ) : (
            <>
              <header className="chat-conversation-header">
                <div className="chat-participant-heading">
                  <ParticipantAvatar
                    className="chat-header-avatar"
                    image={selectedConversation.partner.image}
                    name={selectedConversation.partner.name}
                  />
                  <div>
                  <p className="chat-eyebrow">{selectedConversation.title}</p>
                  <h2>{selectedConversation.partner.name}</h2>
                  <span className="chat-campaign-status">{selectedConversation.campaignStatus}</span>
                  </div>
                </div>
                <div className="chat-safety-actions">
                  <button
                    type="button"
                    className="chat-secondary-button"
                    onClick={() => setReporting(current => !current)}
                  >
                    {reporting ? 'Cancel report' : 'Report'}
                  </button>
                  <button
                    type="button"
                    className="chat-danger-button"
                    onClick={toggleBlock}
                    disabled={busy}
                  >
                    {blockState.youBlocked ? 'Unblock chat' : 'Block chat'}
                  </button>
                </div>
              </header>

              {reporting && (
                <form className="chat-report-form" onSubmit={submitReport}>
                  <label htmlFor="chat-report-reason">Why are you reporting this participant?</label>
                  <textarea
                    id="chat-report-reason"
                    value={reportReason}
                    onChange={event => setReportReason(event.target.value)}
                    minLength="10"
                    maxLength="1000"
                    required
                  />
                  <button
                    type="submit"
                    className="chat-secondary-button"
                    disabled={busy || reportReason.trim().length < 10}
                  >
                    Submit report
                  </button>
                </form>
              )}

              <div
                className="chat-message-list"
                ref={messageListRef}
                aria-live="polite"
                onScroll={event => {
                  const element = event.currentTarget;
                  shouldAutoScrollRef.current =
                    element.scrollHeight - element.scrollTop - element.clientHeight < 48;
                }}
              >
                {loadingMessages ? (
                  <p className="chat-empty">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="chat-empty">No messages yet. Send the first campaign message.</p>
                ) : (
                  messages.map(message => (
                    <div
                      key={message._id}
                      className={`chat-message-row ${message.isMine ? 'mine' : 'theirs'}`}
                    >
                      <ParticipantAvatar
                        className="chat-message-avatar"
                        image={message.senderImage || (message.isMine ? myProfile?.image : selectedConversation.partner.image)}
                        name={message.isMine ? 'You' : message.senderName}
                      />
                      <article className={`chat-message ${message.isMine ? 'mine' : 'theirs'}`}>
                        <div className="chat-message-meta">
                          <strong>{message.isMine ? 'You' : message.senderName}</strong>
                          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                        </div>
                        <p>{message.body}</p>
                      </article>
                    </div>
                  ))
                )}
              </div>

              {chatIsBlocked && (
                <p className="chat-readonly-notice" role="status">
                  {blockState.youBlocked
                    ? 'You blocked this chat. Messages remain visible, but sending is disabled.'
                    : 'This chat is read-only because the other participant blocked it.'}
                </p>
              )}
              <form className="chat-composer" onSubmit={sendMessage}>
                <label className="visually-hidden" htmlFor="chat-message-input">Write a message</label>
                <textarea
                  id="chat-message-input"
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  maxLength="2000"
                  placeholder={chatIsBlocked ? 'Messaging is disabled for this chat.' : 'Write a message...'}
                  disabled={chatIsBlocked || busy}
                />
                <button
                  type="submit"
                  disabled={chatIsBlocked || busy || !draft.trim()}
                >
                  {busy ? 'Sending...' : 'Send'}
                </button>
              </form>
              <p className="chat-privacy-note">
                Messages are stored with this campaign. Blocking makes the chat read-only and does not change campaign status.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default ChatPage;
