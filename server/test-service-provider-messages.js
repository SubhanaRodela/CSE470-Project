const mongoose = require('mongoose');
const Message = require('./models/Message');
const StoreMessage = require('./models/StoreMessage');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/quicfix', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const testServiceProviderMessages = async () => {
  try {
    console.log('Testing service provider messaging system...');

    // First, let's check if there are existing users
    const existingUsers = await User.find({});
    console.log('Existing users:', existingUsers.length);

    if (existingUsers.length === 0) {
      console.log('No existing users found. Creating test users...');
      
      // Create test user
      const testUser = new User({
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'password123',
        userType: 'user',
        phone: '1234567890'
      });

      // Create test service provider
      const testProvider = new User({
        name: 'Test Plumber',
        email: 'plumber@test.com',
        password: 'password123',
        userType: 'service provider',
        phone: '0987654321',
        occupation: 'Plumber',
        services: ['Plumbing', 'Repair'],
        charge: 50,
        longitude: -73.935242,
        latitude: 40.730610
      });

      await testUser.save();
      await testProvider.save();
      
      console.log('Test users created:', {
        user: testUser._id,
        provider: testProvider._id
      });
    } else {
      console.log('Using existing users');
    }

    // Get or create users for testing
    let testUser = await User.findOne({ userType: 'user' });
    let testProvider = await User.findOne({ userType: 'service provider' });

    if (!testUser || !testProvider) {
      console.log('Required user types not found. Creating them...');
      
      if (!testUser) {
        testUser = new User({
          name: 'Test Customer',
          email: 'customer@test.com',
          password: 'password123',
          userType: 'user',
          phone: '1234567890'
        });
        await testUser.save();
      }
      
      if (!testProvider) {
        testProvider = new User({
          name: 'Test Plumber',
          email: 'plumber@test.com',
          password: 'password123',
          userType: 'service provider',
          phone: '0987654321',
          occupation: 'Plumber',
          services: ['Plumbing', 'Repair'],
          charge: 50,
          longitude: -73.935242,
          latitude: 40.730610
        });
        await testProvider.save();
      }
    }

    console.log('Test users ready:', {
      user: testUser._id,
      provider: testProvider._id
    });

    // Test sending message from user to service provider
    const conversationId = Message.generateConversationId(testUser._id, testProvider._id);
    
    const message = new Message({
      sender: testUser._id,
      receiver: testProvider._id,
      content: 'Hello! I need plumbing services for my kitchen sink.',
      conversationId: conversationId
    });

    await message.save();
    console.log('Message sent from user to provider:', message._id);

    // Create StoreMessage entries
    const userStoreMessage = new StoreMessage({
      userId: testUser._id,
      otherUserId: testProvider._id,
      otherUserName: testProvider.name,
      otherUserType: testProvider.userType,
      lastMessage: {
        content: message.content,
        senderId: testUser._id,
        timestamp: message.createdAt
      },
      conversationId: conversationId
    });

    const providerStoreMessage = new StoreMessage({
      userId: testProvider._id,
      otherUserId: testUser._id,
      otherUserName: testUser.name,
      otherUserType: testUser.userType,
      lastMessage: {
        content: message.content,
        senderId: testUser._id,
        timestamp: message.createdAt
      },
      unreadCount: 1, // Provider has 1 unread message
      conversationId: conversationId
    });

    await userStoreMessage.save();
    await providerStoreMessage.save();

    console.log('StoreMessages created successfully');

    // Test retrieving conversations for service provider
    const providerConversations = await StoreMessage.find({ userId: testProvider._id });
    console.log('Provider conversations:', providerConversations.length);
    console.log('Provider unread count:', providerConversations[0]?.unreadCount || 0);

    // Test retrieving conversations for user
    const userConversations = await StoreMessage.find({ userId: testUser._id });
    console.log('User conversations:', userConversations.length);
    console.log('User unread count:', userConversations[0]?.unreadCount || 0);

    // Test the actual message retrieval
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name userType')
      .populate('receiver', 'name userType');

    console.log('Messages in conversation:', messages.length);
    messages.forEach(msg => {
      console.log(`- ${msg.sender.name} (${msg.sender.userType}) -> ${msg.receiver.name} (${msg.receiver.userType}): ${msg.content}`);
    });

    console.log('Service provider messaging test completed successfully!');
    console.log('\nTo test the frontend:');
    console.log('1. Login as the service provider (plumber@test.com)');
    console.log('2. Check the navbar message icon for red dot');
    console.log('3. Click the message icon to see conversations');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

testServiceProviderMessages();
