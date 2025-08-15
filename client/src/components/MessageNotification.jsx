import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MessageNotification.css';

const MessageNotification = ({ userType }) => {
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load unread messages on component mount
    loadUnreadMessages();
    
    // Set up interval to check for new messages every 30 seconds
    const interval = setInterval(loadUnreadMessages, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/chat/unread-messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadMessages(data.data || []);
      }
    } catch (error) {
      console.error('Error loading unread messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = (senderId, senderName) => {
    setIsDropdownOpen(false);
    // Navigate to chatbox with the specific sender
    navigate(`/chatbox?senderId=${senderId}&senderName=${encodeURIComponent(senderName)}`);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      loadUnreadMessages(); // Refresh messages when opening dropdown
    }
  };

  const unreadCount = unreadMessages.length;

  return (
    <div className="message-notification" ref={dropdownRef}>
      <button
        className="message-notification-btn"
        onClick={toggleDropdown}
        title="Messages"
      >
        <i className="bi bi-envelope"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isDropdownOpen && (
        <div className="message-dropdown">
          <div className="dropdown-header">
            <h6>Messages</h6>
            {unreadCount > 0 && (
              <span className="unread-count">{unreadCount} unread</span>
            )}
          </div>
          
          <div className="dropdown-content">
            {loading ? (
              <div className="loading-messages">
                <div className="spinner-small"></div>
                <span>Loading...</span>
              </div>
            ) : unreadMessages.length > 0 ? (
              unreadMessages.map((message) => (
                <div
                  key={message._id}
                  className="message-item"
                  onClick={() => handleMessageClick(message.sender._id, message.sender.name)}
                >
                  <div className="message-avatar">
                    <i className="bi bi-person-circle"></i>
                  </div>
                  <div className="message-info">
                    <div className="sender-name">{message.sender.name}</div>
                    <div className="message-preview">{message.content}</div>
                    <div className="message-time">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                  <div className="unread-indicator"></div>
                </div>
              ))
            ) : (
              <div className="no-messages">
                <i className="bi bi-chat-dots"></i>
                <span>No new messages</span>
              </div>
            )}
          </div>
          
          <div className="dropdown-footer">
            <button
              className="view-all-btn"
              onClick={() => {
                setIsDropdownOpen(false);
                navigate('/chatbox');
              }}
            >
              View All Messages
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const formatTime = (date) => {
  const now = new Date();
  const messageDate = new Date(date);
  
  if (now.toDateString() === messageDate.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default MessageNotification;
