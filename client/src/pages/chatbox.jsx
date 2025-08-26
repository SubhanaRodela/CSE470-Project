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
  const [lastMessageId, setLastMessageId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

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
      console.log('Conversation selected, starting polling...');
      startMessagePolling();
    } else if (!selectedConversation && isPolling) {
      console.log('No conversation selected, stopping polling...');
      stopMessagePolling();
    }

    return () => {
      if (isPolling) {
        stopMessagePolling();
      }
    };
  }, [selectedConversation]);

  // Force start polling when messages are loaded
  useEffect(() => {
    if (selectedConversation && messages.length > 0 && !isPolling) {
      console.log('Messages loaded, starting polling...');
      startMessagePolling();
    }
  }, [messages, selectedConversation, isPolling]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      stopMessagePolling();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const scrollToBottom = () => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (isAtBottom) {
      setIsUserScrolling(false);
    } else if (scrollTop < lastScrollTop) {
      setIsUserScrolling(true);
    }
    
    setLastScrollTop(scrollTop);
  };

  // Start real-time message polling
  const startMessagePolling = () => {
    if (pollingIntervalRef.current) return;
    
    console.log('Starting message polling for conversation:', selectedConversation?.otherUser?.id);
    setIsPolling(true);
    // More aggressive polling for real-time feel
    pollingIntervalRef.current = setInterval(async () => {
      if (selectedConversation) {
        await pollForNewMessages();
      }
    }, 500); // Poll every 500ms for more responsive feel
  };

  // Stop real-time message polling
  const stopMessagePolling = () => {
    if (pollingIntervalRef.current) {
      console.log('Stopping message polling');
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
        
        console.log('Polling - Current messages:', messages.length, 'New messages:', newMessages.length);
        console.log('Last message ID comparison:', lastMessageId, 'vs', newMessages.length > 0 ? newMessages[newMessages.length - 1]._id : 'none');
        
        // Always check for new messages by comparing message count and content
        if (newMessages.length !== messages.length || 
            (newMessages.length > 0 && messages.length > 0 && 
             newMessages[newMessages.length - 1]._id !== messages[messages.length - 1]._id)) {
          
          console.log('New messages detected! Updating...');
          
          // Update messages immediately
          setMessages(newMessages);
          
          // Update last message ID for future comparisons
          if (newMessages.length > 0) {
            setLastMessageId(newMessages[newMessages.length - 1]._id);
            setLastMessageTimestamp(newMessages[newMessages.length - 1].createdAt);
          }
          
          // Mark new messages as read
          await markMessagesAsRead();
          
          // Update conversations list to reflect new messages
          await loadConversations();
          
          // Refresh navbar unread count
          refreshNavbarUnreadCount();
        }
      }
    } catch (error) {
      console.error('Error polling for messages:', error);
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Clear existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing indicator
    setIsTyping(true);
    
    // Clear typing indicator after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
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
        
        // Set last message timestamp and ID for polling
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          setLastMessageTimestamp(lastMessage.createdAt);
          setLastMessageId(lastMessage._id);
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
      
      // Create a temporary message object for immediate display
      const tempMessage = {
        _id: `temp_${Date.now()}`,
        content: newMessage.trim(),
        sender: { _id: user.id, name: user.name, userType: user.userType },
        receiver: selectedConversation.otherUser.id,
        createdAt: new Date(),
        isRead: false
      };
      
      // Add message immediately to the UI for instant feedback
      setMessages(prev => [...prev, tempMessage]);
      const messageToSend = newMessage.trim();
      setNewMessage('');
      
      // Focus input for next message
      inputRef.current?.focus();
      
      // Scroll to bottom to show new message
      setTimeout(() => scrollToBottom(), 100);
      
      const response = await fetch('http://localhost:5000/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedConversation.otherUser.id,
          content: messageToSend
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Replace temporary message with real message from server
        setMessages(prev => prev.map(msg => 
          msg._id === tempMessage._id 
            ? {
                ...msg,
                _id: data.data._id,
                createdAt: new Date(data.data.createdAt)
              }
            : msg
        ));
        
        // Update last message timestamp and ID
        setLastMessageTimestamp(new Date(data.data.createdAt));
        setLastMessageId(data.data._id);
        
        // Update conversations list
        await loadConversations();
        
        // Refresh navbar unread count
        refreshNavbarUnreadCount();
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData);
        
        // Remove temporary message if sending failed
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        setNewMessage(messageToSend); // Restore the message text
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove temporary message if sending failed
      setMessages(prev => prev.filter(msg => msg._id.startsWith('temp_')));
      setNewMessage(newMessage.trim()); // Restore the message text
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
    <div className="dashboard-container">
      <Navbar />
      <div className="container-fluid">
        <div className="row mt-5">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-6 mb-0">Messages</h1>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
            </div>

            <div className="chatbox-content">
              {!selectedConversation ? (
                // Conversations List View
                <div className="conversations-view">
                  <div className="search-container mb-4">
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="conversations-list">
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-success" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading conversations...</p>
                      </div>
                    ) : filteredConversations.length > 0 ? (
                      <div className="conversations-grid">
                        {filteredConversations.map((conversation) => (
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
                                <h6 className="conversation-name mb-1">{conversation.otherUser.name}</h6>
                                <span className="conversation-time">
                                  {formatTime(conversation.lastMessage.createdAt)}
                                </span>
                              </div>
                              <div className="conversation-preview">
                                <p className="conversation-last-message mb-1">
                                  {conversation.lastMessage.content || 'No messages yet'}
                                </p>
                                {conversation.unreadCount > 0 && (
                                  <span className="badge bg-danger">{conversation.unreadCount}</span>
                                )}
                              </div>
                              <small className="text-muted">{conversation.otherUser.userType}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <i className="bi bi-chat-dots display-4 text-muted"></i>
                        <h5 className="mt-3 text-muted">No conversations yet</h5>
                        <p className="text-muted">Start chatting with service providers to see your conversations here.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Chat View
                <div className="chat-view">
                  <div className="chat-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="chat-user-info d-flex align-items-center">
                        <div className="chat-user-avatar me-3">
                          {selectedConversation.otherUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="mb-0">{selectedConversation.otherUser.name}</h5>
                          <small className="text-muted">{selectedConversation.otherUser.userType}</small>
                        </div>
                      </div>
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={handleBackToConversations}
                      >
                        ← Back to Conversations
                      </button>
                    </div>
                  </div>

                  <div className="messages-container" onScroll={handleScroll}>
                    {messages.length > 0 ? (
                      <div className="messages-list">
                        {messages.map((message) => (
                          <div
                            key={message._id}
                            className={`message ${isOwnMessage(message) ? 'sent' : 'received'} ${message._id.startsWith('temp_') ? 'sending' : ''}`}
                          >
                            <div className="message-content">
                              <p className="mb-2">{message.content}</p>
                              <div className="message-footer">
                                <span className="message-time">
                                  {formatTime(message.createdAt)}
                                </span>
                                {message._id.startsWith('temp_') && (
                                  <span className="message-status">
                                    <i className="bi bi-clock"></i> Sending...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <i className="bi bi-chat-dots display-4 text-muted"></i>
                        <h5 className="mt-3 text-muted">No messages yet</h5>
                        <p className="text-muted">Start the conversation!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="typing-indicator">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-text">{selectedConversation.otherUser.name} is typing...</span>
                    </div>
                  )}

                  <form className="message-input-form" onSubmit={sendMessage}>
                    <div className="message-input-wrapper">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyPress={handleKeyPress}
                        className="form-control"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary ms-2"
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? (
                          <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Sending...</span>
                          </div>
                        ) : (
                          <>
                            <i className="bi bi-send me-1"></i>
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
