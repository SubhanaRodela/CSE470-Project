import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiMessageSquareDetail } from 'react-icons/bi';
import { IoMdSettings } from 'react-icons/io';
import { IoLogOutOutline } from 'react-icons/io5';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMessageList, setShowMessageList] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const messageListRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      console.log('Navbar - User data loaded:', parsedUser);
      setUser(parsedUser);
    } else {
      // For testing purposes, create a mock user
      setUser({
        name: 'Test User',
        userType: 'user'
      });
    }
  }, []);

  useEffect(() => {
    if (user) {
      console.log('Navbar - Loading data for user:', user);
      // Load data only once when component mounts
      loadUnreadCount();
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    // Listen for refresh unread count events
    const handleRefreshUnreadCount = () => {
      loadUnreadCount();
      loadConversations();
    };

    window.addEventListener('refreshUnreadCount', handleRefreshUnreadCount);
    
    return () => {
      window.removeEventListener('refreshUnreadCount', handleRefreshUnreadCount);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (messageListRef.current && !messageListRef.current.contains(event.target)) {
        setShowMessageList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef, messageListRef]);

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Loading unread count with token:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }

      const response = await fetch('http://localhost:5000/api/recent-messages/my-recent-messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Unread count response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Recent messages data:', data);
        // Calculate total unread count from all conversations
        const totalUnread = data.data ? data.data.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0) : 0;
        setUnreadCount(totalUnread);
      } else {
        const errorData = await response.json();
        console.error('Failed to load unread count:', errorData);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Loading recent messages with token:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }

      const response = await fetch('http://localhost:5000/api/recent-messages/my-recent-messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Recent messages response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Recent messages data:', data);
        setConversations(data.data || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load recent messages:', errorData);
      }
    } catch (error) {
      console.error('Error loading recent messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to get the correct user ID
  const getUserId = () => {
    if (!user) return null;
    // Handle both _id and id fields
    return user._id || user.id;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSettings = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  const handleMessages = () => {
    if (!showMessageList) {
      // Only load data when opening the dropdown for the first time
      loadUnreadCount();
      loadConversations();
    }
    setShowMessageList(!showMessageList);
  };

  const handleConversationClick = (conversation) => {
    setShowMessageList(false);
    // Handle both user and provider types
    if (user.userType === 'user') {
      // For users, navigate to provider chat
      navigate(`/chatbox?providerId=${conversation.provider.id}`);
    } else if (user.userType === 'service provider') {
      // For providers, navigate to user chat
      navigate(`/chatbox?providerId=${conversation.user.id}`);
    }
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !showDropdown;
    setShowDropdown(newState);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase();
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

  if (!user) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left side - QuicFix branding */}
        <div className="navbar-brand" onClick={() => navigate('/user-dashboard')}>
          QuickFix
        </div>

        {/* Right side - Navigation links, Profile picture and message icon */}
        <div className="navbar-right">
          {/* Navigation Links */}
          <div className="navbar-links">
            <button
              onClick={() => {
                if (user.userType === 'user') {
                  navigate('/user-service');
                } else if (user.userType === 'service provider') {
                  navigate('/orders');
                }
              }}
              className="nav-link"
              title={user.userType === 'user' ? 'My Bookings' : 'My Orders'}
              type="button"
            >
              <i className="bi bi-calendar-check" style={{ fontSize: '20px' }}></i>
              <span>{user.userType === 'user' ? 'Bookings' : 'Orders'}</span>
            </button>
            
            <button
              onClick={() => navigate('/pay')}
              className="nav-link"
              title="QPay - Payment System"
              type="button"
            >
              <i className="bi bi-credit-card" style={{ fontSize: '20px' }}></i>
              <span>QPay</span>
            </button>
            
            <button
              onClick={() => navigate('/transaction-history')}
              className="nav-link"
              title="Transaction History"
              type="button"
            >
              <i className="bi bi-receipt" style={{ fontSize: '20px' }}></i>
              <span>History</span>
            </button>
          </div>

          {/* Message icon with unread count */}
          <div className="message-container" ref={messageListRef}>
            <button
              onClick={handleMessages}
              className="nav-link"
              title="Messages"
              type="button"
            >
              <BiMessageSquareDetail size={20} />
              <span>Messages</span>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </button>

            {/* Message List Modal */}
            {showMessageList && (
              <div className="message-list-modal">
                <div className="message-list-header">
                  <h3>Messages</h3>
                  <button 
                    className="close-button"
                    onClick={() => setShowMessageList(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="message-list-content">
                  {loading ? (
                    <div className="loading-messages">
                      <div className="spinner"></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : conversations.length > 0 ? (
                    conversations.map((conversation) => {
                      // Determine the other person's info based on user type
                      const otherPerson = user.userType === 'user' ? conversation.provider : conversation.user;
                      const isUnread = conversation.unreadCount > 0;
                      
                      return (
                        <div
                          key={conversation.conversationId}
                          className={`message-item ${isUnread ? 'unread' : ''}`}
                          onClick={() => handleConversationClick(conversation)}
                        >
                          <div className="message-avatar">
                            {otherPerson.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="message-content">
                            <div className="message-header">
                              <h4 className={`message-name ${isUnread ? 'fw-bold' : ''}`}>
                                {otherPerson.name}
                              </h4>
                              <span className="message-time">
                                {formatTime(conversation.lastMessage.timestamp)}
                              </span>
                            </div>
                            <div className="message-preview">
                              <p className={`message-text ${isUnread ? 'fw-bold' : ''}`}>
                                {conversation.lastMessage.content || 'No messages yet'}
                              </p>
                              {isUnread && (
                                <span className="message-unread-badge">{conversation.unreadCount}</span>
                              )}
                            </div>
                            <small className="message-type">
                              {user.userType === 'user' ? otherPerson.occupation || 'Service Provider' : 'User'}
                            </small>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-messages">
                      <p>No conversations yet</p>
                      <small>Start chatting to see your messages here</small>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile picture with dropdown */}
          <div className="profile-dropdown" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className={`profile-picture ${showDropdown ? 'active' : ''}`}
              title="Profile"
              type="button"
            >
              {getInitials(user.name)}
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="dropdown-menu" style={{ display: 'block' }}>
                <div className="dropdown-header">
                  <p className="user-name">{user.name}</p>
                  <p className="user-type">{user.userType}</p>
                </div>
                
                <button
                  onClick={handleSettings}
                  className="dropdown-item"
                  type="button"
                >
                  <IoMdSettings size={16} />
                  <span>Settings</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="dropdown-item"
                  type="button"
                >
                  <IoLogOutOutline size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
