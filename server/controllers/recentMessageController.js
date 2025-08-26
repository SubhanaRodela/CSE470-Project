const RecentMessage = require('../models/RecentMessage');
const User = require('../models/User');

// Get recent messages for a user (shows providers they've messaged)
const getUserRecentMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Getting recent messages for user:', userId);
    
    // Get all recent messages where this user is the sender
    const recentMessages = await RecentMessage.find({ userId })
      .populate('providerId', '_id name occupation userType')
      .sort({ 'lastMessage.timestamp': -1 });

    console.log('Found recent messages:', recentMessages.length);
    
    // Filter out messages with null providerId and log any issues
    const validMessages = recentMessages.filter(msg => {
      if (!msg.providerId) {
        console.log('Found message with null providerId:', msg._id);
        return false;
      }
      return true;
    });

    const formattedMessages = validMessages.map(msg => ({
      id: msg._id,
      provider: {
        id: msg.providerId._id,
        name: msg.providerId.name,
        occupation: msg.providerId.occupation,
        userType: msg.providerId.userType
      },
      lastMessage: {
        content: msg.lastMessage.content,
        timestamp: msg.lastMessage.timestamp,
        senderId: msg.lastMessage.senderId
      },
      unreadCount: msg.unreadCount,
      conversationId: msg.conversationId
    }));

    console.log('Returning formatted messages:', formattedMessages.length);

    res.json({
      success: true,
      message: 'Recent messages retrieved successfully',
      data: formattedMessages
    });

  } catch (error) {
    console.error('Get user recent messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving recent messages' 
    });
  }
};

// Get recent messages for a provider (shows users who've messaged them)
const getProviderRecentMessages = async (req, res) => {
  try {
    const providerId = req.user.userId;
    console.log('Getting recent messages for provider:', providerId);
    
    // Get all recent messages where this provider is the receiver
    const recentMessages = await RecentMessage.find({ providerId })
      .populate('userId', '_id name userType')
      .sort({ 'lastMessage.timestamp': -1 });

    console.log('Found recent messages:', recentMessages.length);
    
    // Filter out messages with null userId and log any issues
    const validMessages = recentMessages.filter(msg => {
      if (!msg.userId) {
        console.log('Found message with null userId:', msg._id);
        return false;
      }
      return true;
    });

    const formattedMessages = validMessages.map(msg => ({
      id: msg._id,
      user: {
        id: msg.userId._id,
        name: msg.userId.name,
        userType: msg.userId.userType
      },
      lastMessage: {
        content: msg.lastMessage.content,
        timestamp: msg.lastMessage.timestamp,
        senderId: msg.lastMessage.senderId
      },
      unreadCount: msg.unreadCount,
      conversationId: msg.conversationId
    }));

    console.log('Returning formatted messages:', formattedMessages.length);

    res.json({
      success: true,
      message: 'Recent messages retrieved successfully',
      data: formattedMessages
    });

  } catch (error) {
    console.error('Get provider recent messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving recent messages' 
    });
  }
};

// Create or update recent message record
const updateRecentMessage = async (userId, providerId, messageContent, senderId) => {
  try {
    const conversationId = `${Math.min(userId.toString(), providerId.toString())}_${Math.max(userId.toString(), providerId.toString())}`;
    
    // Update or create recent message record
    await RecentMessage.findOneAndUpdate(
      { userId, providerId },
      {
        lastMessage: {
          content: messageContent,
          senderId: senderId,
          timestamp: new Date()
        },
        $inc: { unreadCount: senderId.toString() === providerId.toString() ? 1 : 0 },
        conversationId
      },
      { upsert: true, new: true }
    );

    // Also create/update the reverse record for the provider
    await RecentMessage.findOneAndUpdate(
      { userId: providerId, providerId: userId },
      {
        lastMessage: {
          content: messageContent,
          senderId: senderId,
          timestamp: new Date()
        },
        $inc: { unreadCount: senderId.toString() === userId.toString() ? 1 : 0 },
        conversationId
      },
      { upsert: true, new: true }
    );

  } catch (error) {
    console.error('Error updating recent message:', error);
  }
};

// Mark messages as read for a specific conversation
const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.userId;

    // Reset unread count for this conversation
    await RecentMessage.updateMany(
      { 
        conversationId,
        $or: [
          { userId: currentUserId },
          { providerId: currentUserId }
        ]
      },
      { unreadCount: 0 }
    );

    res.json({
      success: true,
      message: 'Conversation marked as read',
      data: { conversationId }
    });

  } catch (error) {
    console.error('Mark conversation as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while marking conversation as read' 
    });
  }
};

module.exports = {
  getUserRecentMessages,
  getProviderRecentMessages,
  updateRecentMessage,
  markConversationAsRead
};
