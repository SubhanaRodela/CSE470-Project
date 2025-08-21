import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/Chatbox.css';

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
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

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
  }, [navigate, providerId]);

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
    }, 3000); // Poll every 3 seconds
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

  // Play notification sound
  const playNotificationSound = () => {
    if (!audioEnabled) return;
    
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    } catch (error) {
      // Ignore audio errors
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
          
          // Play notification sound
          playNotificationSound();
          
          // Hide indicator after 2 seconds
          setTimeout(() => {
            setShowNewMessageIndicator(false);
            setNewMessageCount(0);
          }, 2000);
          
                  // Update messages
        setMessages(newMessages);
        
        // Mark new messages as read
        await markMessagesAsRead();
        
        // Highlight new messages briefly
        const newMessageElements = document.querySelectorAll('.message.received');
        newMessageElements.forEach((element, index) => {
          if (index >= messages.length) {
            element.classList.add('new-message-highlight');
            setTimeout(() => {
              element.classList.remove('new-message-highlight');
            }, 3000);
          }
        });
        
        // Update conversations list to reflect new messages
        await loadConversations();
        }
      }
    } catch (error) {
      // Silently handle errors to avoid disrupting user experience
    }
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

    console.log('Sending message:', {
      content: newMessage.trim(),
      receiverId: selectedConversation.otherUser.id,
      user: user,
      selectedConversation: selectedConversation
    });

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
        console.log('Message sent successfully:', data);
        
        // Add new message to the list immediately for instant feedback
        const messageObj = {
          _id: data.data._id,
          content: newMessage.trim(),
          sender: { _id: user.id, name: user.name, userType: user.userType },
          receiver: selectedConversation.otherUser.id,
          createdAt: new Date(),
          isRead: false
        };
        
        console.log('Created message object:', messageObj);
        setMessages(prev => [...prev, messageObj]);
        setNewMessage('');
        
        // Update last message timestamp
        setLastMessageTimestamp(messageObj.createdAt);
        
        // Update conversations list
        await loadConversations();
        
        // Focus input for next message
        inputRef.current?.focus();
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

  if (!user) {
    return <div className="chatbox-loading">Loading...</div>;
  }

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">
        <div className="chatbox-header-content">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left"></i>
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
                <i className="bi bi-search search-icon"></i>
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
                      <i className="bi bi-person-circle"></i>
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
                  <i className="bi bi-chat-dots"></i>
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
                <i className="bi bi-arrow-left"></i>
              </button>
              <div className="chat-user-info">
                <div className="chat-user-avatar">
                  <i className="bi bi-person-circle"></i>
                </div>
                <div>
                  <h4>{selectedConversation.otherUser.name}</h4>
                  <small>{selectedConversation.otherUser.userType}</small>
                  <div className="online-indicator">
                    <span className="online-dot"></span>
                    <span className="online-text">online</span>
                    <span className="last-seen">last seen just now</span>
                  </div>
                </div>
                                  <button
                    className={`audio-toggle ${audioEnabled ? 'enabled' : 'disabled'}`}
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    title={audioEnabled ? 'Disable sound notifications' : 'Enable sound notifications'}
                  >
                    <i className={`bi ${audioEnabled ? 'bi-volume-up' : 'bi-volume-mute'}`}></i>
                  </button>
                  <div className="connection-status">
                    <span className="status-dot connected"></span>
                    <span className="status-text">connected</span>
                  </div>
              </div>
            </div>

            <div className="messages-container">
              {/* New Message Indicator */}
              {showNewMessageIndicator && (
                <div className="new-message-indicator">
                  <i className="bi bi-arrow-down"></i>
                  <span>{newMessageCount} new message{newMessageCount > 1 ? 's' : ''}</span>
                </div>
              )}
              
              {messages.length > 0 ? (
                messages.map((message) => {
                                    console.log('Message debug:', {
                    messageId: message._id,
                    senderId: message.sender._id,
                    userId: user.id,
                    isSent: message.sender._id === user.id,
                    senderName: message.sender.name
                  });
                  return (
                    <div
                      key={message._id}
                      className={`message ${message.sender._id === user.id ? 'sent' : 'received'} ${message._id === 'temp' ? 'sending' : ''}`}
                    >
                      <div className="message-content">
                        <p>{message.content}</p>
                        <div className="message-footer">
                          <span className="message-time">
                            {formatTime(message.createdAt)}
                          </span>
                          {message.sender._id === user.id && (
                            <span className="message-status">
                              <i className="bi bi-check2-all"></i>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-messages">
                  <i className="bi bi-chat-dots"></i>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              {/* Typing Indicator */}
              {otherUserTyping && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">typing...</span>
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
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (e.target.value.trim()) {
                      setIsTyping(true);
                      // Simulate typing indicator for other user
                      setTimeout(() => setOtherUserTyping(true), 1000);
                      setTimeout(() => setOtherUserTyping(false), 3000);
                    } else {
                      setIsTyping(false);
                    }
                  }}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
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
                    <i className="bi bi-send"></i>
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
