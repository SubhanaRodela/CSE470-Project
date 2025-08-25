const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  sendMessage,
  getConversation,
  getUserConversations,
  markAsRead,
  getUnreadCount,
  getUnreadMessages
} = require('../controllers/chatController');

// All routes require authentication
router.use(authenticateToken);

// Send a message
router.post('/send', sendMessage);

// Get conversation between current user and another user
router.get('/conversation/:otherUserId', getConversation);

// Get all conversations for current user
router.get('/conversations', getUserConversations);

// Mark messages as read in a conversation
router.put('/read/:otherUserId', markAsRead);

// Get unread messages count for current user
router.get('/unread-count', getUnreadCount);

// Get unread messages for current user
router.get('/unread-messages', getUnreadMessages);

module.exports = router;
