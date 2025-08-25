const mongoose = require('mongoose');
const Message = require('./models/Message');
const StoreMessage = require('./models/StoreMessage');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/quicfix', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const testMessaging = async () => {
  try {
    console.log('Testing messaging system...');

    // Create test users
    const user1 = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      userType: 'user',
      phone: '1234567890'
    });

    const user2 = new User({
      name: 'Test Provider',
      email: 'testprovider@example.com',
      password: 'password123',
      userType: 'service provider',
      phone: '0987654321',
      occupation: 'Plumber',
      services: ['Plumbing', 'Repair'],
      charge: 50
    });

    await user1.save();
    await user2.save();

    console.log('Test users created:', { user1: user1._id, user2: user2._id });

    // Test sending message
    const conversationId = Message.generateConversationId(user1._id, user2._id);
    
    const message = new Message({
      sender: user1._id,
      receiver: user2._id,
      content: 'Hello, I need plumbing services',
      conversationId: conversationId
    });

    await message.save();
    console.log('Message saved:', message._id);

    // Test StoreMessage creation
    const storeMessage1 = new StoreMessage({
      userId: user1._id,
      otherUserId: user2._id,
      otherUserName: user2.name,
      otherUserType: user2.userType,
      lastMessage: {
        content: message.content,
        senderId: user1._id,
        timestamp: message.createdAt
      },
      conversationId: conversationId
    });

    const storeMessage2 = new StoreMessage({
      userId: user2._id,
      otherUserId: user1._id,
      otherUserName: user1.name,
      otherUserType: user1.userType,
      lastMessage: {
        content: message.content,
        senderId: user1._id,
        timestamp: message.createdAt
      },
      unreadCount: 1,
      conversationId: conversationId
    });

    await storeMessage1.save();
    await storeMessage2.save();

    console.log('StoreMessages created successfully');

    // Test retrieving conversations
    const user1Conversations = await StoreMessage.find({ userId: user1._id });
    const user2Conversations = await StoreMessage.find({ userId: user2._id });

    console.log('User 1 conversations:', user1Conversations.length);
    console.log('User 2 conversations:', user2Conversations.length);
    console.log('User 2 unread count:', user2Conversations[0].unreadCount);

    console.log('Messaging system test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

testMessaging();
