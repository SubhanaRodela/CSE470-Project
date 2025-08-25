const Message = require('../models/Message');
const StoreMessage = require('../models/StoreMessage');
const User = require('../models/User');
const RecentMessage = require('../models/RecentMessage');

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;
    const senderId = req.user.userId;
    
    console.log('SendMessage - Request body:', req.body);
    console.log('SendMessage - User from token:', req.user);
    console.log('SendMessage - Sender ID:', senderId);

    // Validate input
    if (!receiverId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Receiver ID and content are required' 
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Receiver not found' 
      });
    }
    
    console.log('SendMessage - Receiver found:', receiver.name);

    // Generate conversation ID
    const conversationId = Message.generateConversationId(senderId, receiverId);

    // Create and save the message
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      messageType,
      conversationId
    });

    console.log('SendMessage - Message object created:', message);
    
    await message.save();
    console.log('SendMessage - Message saved successfully');

    // Update or create StoreMessage for sender
    await StoreMessage.findOneAndUpdate(
      { userId: senderId, otherUserId: receiverId },
      {
        otherUserName: receiver.name,
        otherUserType: receiver.userType,
        lastMessage: {
          content: content,
          senderId: senderId,
          timestamp: new Date()
        },
        conversationId: conversationId
      },
      { upsert: true, new: true }
    );

    // Update or create StoreMessage for receiver (with unread count)
    await StoreMessage.findOneAndUpdate(
      { userId: receiverId, otherUserId: senderId },
      {
        otherUserName: req.user.name,
        otherUserType: req.user.userType,
        lastMessage: {
          content: content,
          senderId: senderId,
          timestamp: new Date()
        },
        $inc: { unreadCount: 1 },
        conversationId: conversationId
      },
      { upsert: true, new: true }
    );

    // Update recent messages for both users
    await RecentMessage.findOneAndUpdate(
      { userId: senderId, providerId: receiverId },
      {
        lastMessage: {
          content: content,
          senderId: senderId,
          timestamp: new Date()
        },
        conversationId: conversationId
      },
      { upsert: true, new: true }
    );

    // Update recent messages for the provider (receiver)
    await RecentMessage.findOneAndUpdate(
      { userId: receiverId, providerId: senderId },
      {
        lastMessage: {
          content: content,
          senderId: senderId,
          timestamp: new Date()
        },
        $inc: { unreadCount: 1 },
        conversationId: conversationId
      },
      { upsert: true, new: true }
    );

    // Populate sender and receiver details
    await message.populate([
      { path: 'sender', select: '_id name userType' },
      { path: 'receiver', select: '_id name userType' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while sending message' 
    });
  }
};

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    // Validate input
    if (!otherUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Other user ID is required' 
      });
    }

    // Check if other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate conversation ID
    const conversationId = Message.generateConversationId(currentUserId, otherUserId);

    // Get messages for this conversation
    const messages = await Message.find({ conversationId })
      .populate([
        { path: 'sender', select: '_id name userType' },
        { path: 'receiver', select: '_id name userType' }
      ])
      .sort({ createdAt: 1 });

    // Mark messages as read if they were sent to current user
    if (messages.length > 0) {
      await Message.updateMany(
        { 
          conversationId, 
          receiver: currentUserId, 
          isRead: false 
        },
        { isRead: true }
      );

      // Reset unread count in StoreMessage
      await StoreMessage.findOneAndUpdate(
        { userId: currentUserId, otherUserId: otherUserId },
        { unreadCount: 0 }
      );

      // Reset unread count in RecentMessage
      await RecentMessage.updateMany(
        { 
          conversationId,
          $or: [
            { userId: currentUserId, providerId: otherUserId },
            { userId: otherUserId, providerId: currentUserId }
          ]
        },
        { unreadCount: 0 }
      );
    }

    res.json({
      success: true,
      message: 'Conversation retrieved successfully',
      data: {
        conversationId,
        otherUser: {
          id: otherUser._id,
          name: otherUser.name,
          userType: otherUser.userType
        },
        messages
      }
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving conversation' 
    });
  }
};

// Get all conversations for current user using StoreMessage
const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    console.log('Getting conversations for user ID:', currentUserId);
    console.log('User from token:', req.user);

    // Get all conversations from StoreMessage
    const storeMessages = await StoreMessage.find({ userId: currentUserId })
      .sort({ 'lastMessage.timestamp': -1 });

    console.log('Found store messages:', storeMessages.length);

    const conversations = storeMessages.map(storeMsg => ({
      conversationId: storeMsg.conversationId,
      otherUser: {
        id: storeMsg.otherUserId,
        name: storeMsg.otherUserName,
        userType: storeMsg.otherUserType
      },
      lastMessage: {
        content: storeMsg.lastMessage.content,
        createdAt: storeMsg.lastMessage.timestamp,
        sender: storeMsg.lastMessage.senderId.toString() === currentUserId ? 'me' : 'other'
      },
      unreadCount: storeMsg.unreadCount
    }));

    console.log('Processed conversations:', conversations);

    res.json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: conversations
    });

  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving conversations' 
    });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    // Mark all unread messages in this conversation as read
    const conversationId = Message.generateConversationId(currentUserId, otherUserId);
    
    const result = await Message.updateMany(
      { 
        conversationId, 
        receiver: currentUserId, 
        isRead: false 
      },
      { isRead: true }
    );

    // Reset unread count in StoreMessage
    await StoreMessage.findOneAndUpdate(
      { userId: currentUserId, otherUserId: otherUserId },
      { unreadCount: 0 }
    );

    // Reset unread count in RecentMessage
    await RecentMessage.updateMany(
      { 
        conversationId,
        $or: [
          { userId: currentUserId, providerId: otherUserId },
          { userId: otherUserId, providerId: currentUserId }
        ]
      },
      { unreadCount: 0 }
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: { updatedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while marking messages as read' 
    });
  }
};

// Get unread messages count for current user
const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    console.log('Getting unread count for user ID:', currentUserId);
    console.log('User from token:', req.user);

    // Get total unread count from StoreMessage
    const totalUnread = await StoreMessage.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(currentUserId) } },
      { $group: { _id: null, totalUnread: { $sum: '$unreadCount' } } }
    ]);

    const unreadCount = totalUnread.length > 0 ? totalUnread[0].totalUnread : 0;
    console.log('Total unread count:', unreadCount);

    res.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unreadCount }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving unread count' 
    });
  }
};

// Get unread messages for current user
const getUnreadMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Get unread messages where current user is the receiver
    const unreadMessages = await Message.find({ 
      receiver: currentUserId, 
      isRead: false 
    })
    .populate('sender', '_id name userType')
    .sort({ createdAt: -1 })
    .limit(10); // Limit to 10 most recent unread messages

    res.json({
      success: true,
      message: 'Unread messages retrieved successfully',
      data: unreadMessages
    });

  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving unread messages' 
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getUserConversations,
  markAsRead,
  getUnreadCount,
  getUnreadMessages
};
