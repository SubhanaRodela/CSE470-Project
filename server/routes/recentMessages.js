const express = require('express');
const router = express.Router();
const { 
  getUserRecentMessages, 
  getProviderRecentMessages, 
  markConversationAsRead 
} = require('../controllers/recentMessageController');
const { authenticateToken } = require('../middleware/auth');

// Get recent messages for current user (based on user type)
router.get('/my-recent-messages', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType === 'user') {
      // For users, get providers they've messaged
      return getUserRecentMessages(req, res);
    } else if (req.user.userType === 'service provider') {
      // For providers, get users who've messaged them
      return getProviderRecentMessages(req, res);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }
  } catch (error) {
    console.error('Get recent messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving recent messages'
    });
  }
});

// Mark conversation as read
router.put('/mark-read/:conversationId', authenticateToken, markConversationAsRead);

module.exports = router;
