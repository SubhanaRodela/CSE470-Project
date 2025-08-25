import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/Chatbox.css';
import Navbar from './navbar';

const Chatbox = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Real-time chat polling
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  // Get provider ID or sender ID from URL params if navigating from provider list or message notification
  const providerId = searchParams.get('providerId');
  const senderId = searchParams.get('senderId');
  const senderName = searchParams.get('senderName');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    setUser(userInfo);
    
    // Load conversations
    loadConversations();
    
    // If provider ID is provided, open chat with that provider
    if (providerId) {
      openChatWithProvider(providerId);
    }
    
    // If sender ID is provided (from message notification), open chat with that sender
    if (senderId) {
      openChatWithSender(senderId, senderName);
    }
  }, [navigate, providerId, senderId, senderName]);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.otherUser.userType.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  // Start/stop real-time message polling
  useEffect(() => {
    if (selectedConversation && !isPolling) {
      startMessagePolling();
    } else if (!selectedConversation && isPolling) {
      stopMessagePolling();
    }

    return () => {
      stopMessagePolling();
    };
  }, [selectedConversation, isPolling]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      stopMessagePolling();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Start real-time message polling
  const startMessagePolling = () => {
    if (pollingIntervalRef.current) return;
    
    setIsPolling(true);
    pollingIntervalRef.current = setInterval(async () => {
      if (selectedConversation) {
        await pollForNewMessages();
      }
    }, 2000); // Poll every 2 seconds for more responsive feel
  };

  // Stop real-time message polling
  const stopMessagePolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !selectedConversation) return;

      await fetch(`http://localhost:5000/api/chat/conversation/${selectedConversation.otherUser.id}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      // Silently handle errors
    }
  };

  // Poll for new messages without visual interruption
  const pollForNewMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !selectedConversation) return;

      const response = await fetch(`http://localhost:5000/api/chat/conversation/${selectedConversation.otherUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.data.messages || [];
        
        // Check if there are new messages
        if (newMessages.length > messages.length) {
          const newMessageCount = newMessages.length - messages.length;
          
          // Show new message indicator briefly
          setNewMessageCount(newMessageCount);
          setShowNewMessageIndicator(true);
          
          // Hide indicator after 2 seconds
          setTimeout(() => {
            setShowNewMessageIndicator(false);
            setNewMessageCount(0);
          }, 2000);
          
          // Update messages
          setMessages(newMessages);
          
          // Mark new messages as read
          await markMessagesAsRead();
          
          // Update conversations list to reflect new messages
          await loadConversations();
          
          // Refresh navbar unread count
          refreshNavbarUnreadCount();
        }
      }
    } catch (error) {
      // Silently handle errors to avoid disrupting user experience
    }
  };

  // Function to refresh navbar unread count
  const refreshNavbarUnreadCount = () => {
    // Dispatch custom event to notify navbar
    window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openChatWithProvider = async (providerId) => {
    try {
      // Find if conversation already exists
      const existingConv = conversations.find(conv => conv.otherUser.id === providerId);
      
      if (existingConv) {
        setSelectedConversation(existingConv);
        loadMessages(existingConv.otherUser.id);
      } else {
        // Create a temporary conversation object
        const tempConv = {
          conversationId: `temp_${Date.now()}`,
          otherUser: { id: providerId, name: 'Loading...', userType: 'service provider' },
          lastMessage: { content: '', createdAt: new Date() },
          messageCount: 0,
          unreadCount: 0
        };
        setSelectedConversation(tempConv);
        setMessages([]);
        
        // Load provider details and messages
        await loadProviderDetails(providerId);
        await loadMessages(providerId);
      }
    } catch (error) {
      console.error('Error opening chat with provider:', error);
    }
  };

  const openChatWithSender = async (senderId, senderName) => {
    try {
      // Find if conversation already exists
      const existingConv = conversations.find(conv => conv.otherUser.id === senderId);
      
      if (existingConv) {
        setSelectedConversation(existingConv);
        loadMessages(existingConv.otherUser.id);
      } else {
        // Create a temporary conversation object
        const tempConv = {
          conversationId: `temp_${Date.now()}`,
          otherUser: { id: senderId, name: senderName || 'Loading...', userType: 'user' },
          lastMessage: { content: '', createdAt: new Date() },
          messageCount: 0,
          unreadCount: 0
        };
        setSelectedConversation(tempConv);
        setMessages([]);
        
        // Load sender details and messages
        await loadProviderDetails(senderId);
        await loadMessages(senderId);
      }
    } catch (error) {
      console.error('Error opening chat with sender:', error);
    }
  };

  const loadProviderDetails = async (providerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/user/${providerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(prev => ({
          ...prev,
          otherUser: {
            id: data.user._id,
            name: data.user.name,
            userType: data.user.userType
          }
        }));
      }
    } catch (error) {
      console.error('Error loading provider details:', error);
    }
  };

  const loadMessages = async (otherUserId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/conversation/${otherUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.data.messages || [];
        setMessages(newMessages);
        
        // Set last message timestamp for polling
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          setLastMessageTimestamp(lastMessage.createdAt);
        }
        
        // Update conversation with real data
        if (data.data.conversationId !== 'temp') {
          setSelectedConversation(prev => ({
            ...prev,
            conversationId: data.data.conversationId,
            otherUser: data.data.otherUser
          }));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedConversation.otherUser.id,
          content: newMessage.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add new message to the list immediately for instant feedback
        const messageObj = {
          _id: data.data._id,
          content: newMessage.trim(),
          sender: { _id: user.id, name: user.name, userType: user.userType },
          receiver: selectedConversation.otherUser.id,
          createdAt: new Date(),
          isRead: false
        };
        
        setMessages(prev => [...prev, messageObj]);
        setNewMessage('');
        
        // Update last message timestamp
        setLastMessageTimestamp(messageObj.createdAt);
        
        // Update conversations list
        await loadConversations();
        
        // Focus input for next message
        inputRef.current?.focus();
        
        // Refresh navbar unread count
        refreshNavbarUnreadCount();
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
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

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.otherUser.id);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  // Helper function to determine if message is from current user
  const isOwnMessage = (message) => {
    return message.sender._id === user.id;
  };

  if (!user) {
    return <div className="chatbox-loading">Loading...</div>;
  }

  return (
    <div className="chatbox-container">
      <Navbar />
      <div className="chatbox-header">
        <div className="chatbox-header-content">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <h2>Messages</h2>
        </div>
      </div>

      <div className="chatbox-content">
        {!selectedConversation ? (
          // Conversations List View
          <div className="conversations-view">
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="conversations-list">
              {loading ? (
                <div className="loading-conversations">
                  <div className="spinner"></div>
                  <p>Loading conversations...</p>
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.conversationId}
                    className={`conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="conversation-avatar">
                      {conversation.otherUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="conversation-content">
                      <div className="conversation-header">
                        <h4 className="conversation-name">{conversation.otherUser.name}</h4>
                        <span className="conversation-time">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <p className="conversation-last-message">
                          {conversation.lastMessage.content || 'No messages yet'}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="unread-badge">{conversation.unreadCount}</span>
                        )}
                      </div>
                      <small className="conversation-type">{conversation.otherUser.userType}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-conversations">
                  <h3>No conversations yet</h3>
                  <p>Start chatting with service providers to see your conversations here.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Chat View
          <div className="chat-view">
            <div className="chat-header">
              <button 
                className="back-to-conversations"
                onClick={handleBackToConversations}
              >
                ←
              </button>
              <div className="chat-user-info">
                <div className="chat-user-avatar">
                  {selectedConversation.otherUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4>{selectedConversation.otherUser.name}</h4>
                  <small>{selectedConversation.otherUser.userType}</small>
                </div>
              </div>
            </div>

            <div className="messages-container">
              {/* New Message Indicator */}
              {showNewMessageIndicator && (
                <div className="new-message-indicator">
                  <span>↓ {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}</span>
                </div>
              )}
              
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`message ${isOwnMessage(message) ? 'sent' : 'received'} ${message._id === 'temp' ? 'sending' : ''}`}
                  >
                    <div className="message-content">
                      <p>{message.content}</p>
                      <div className="message-footer">
                        <span className="message-time">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={sendMessage}>
              <div className="message-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="message-input"
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="send-button"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <div className="spinner-small"></div>
                  ) : (
                    <svg className="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbox;
