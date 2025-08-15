const Message = require('../models/Message');
const User = require('../models/User');

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
    await Message.updateMany(
      { 
        conversationId, 
        receiver: currentUserId, 
        isRead: false 
      },
      { isRead: true }
    );

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

// Get all conversations for current user
const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Get all conversations where user is either sender or receiver
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new require('mongoose').Types.ObjectId(currentUserId) },
            { receiver: new require('mongoose').Types.ObjectId(currentUserId) }
          ]
        }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$receiver', new require('mongoose').Types.ObjectId(currentUserId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Populate user details for each conversation
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findById(conv.lastMessage._id)
          .populate([
            { path: 'sender', select: '_id name userType' },
            { path: 'receiver', select: '_id name userType' }
          ]);

        // Determine the other user in the conversation
        const otherUser = lastMessage.sender._id.toString() === currentUserId 
          ? lastMessage.receiver 
          : lastMessage.sender;

        return {
          conversationId: conv._id,
          otherUser: {
            id: otherUser._id,
            name: otherUser.name,
            userType: otherUser.userType
          },
          lastMessage: {
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            createdAt: lastMessage.createdAt,
            sender: lastMessage.sender._id.toString() === currentUserId ? 'me' : 'other'
          },
          messageCount: conv.messageCount,
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: populatedConversations
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
    const { conversationId } = req.params;
    const currentUserId = req.user.userId;

    // Mark all unread messages in this conversation as read
    const result = await Message.updateMany(
      { 
        conversationId, 
        receiver: currentUserId, 
        isRead: false 
      },
      { isRead: true }
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
  getUnreadMessages
};
