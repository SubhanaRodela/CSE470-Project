const mongoose = require('mongoose');
const RecentMessage = require('./models/RecentMessage');
const User = require('./models/User');

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

async function testRecentMessages() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    // Clear existing recent messages
    await RecentMessage.deleteMany({});
    console.log('🗑️ Cleared existing recent messages');

    // Get some test users
    const users = await User.find({ userType: 'user' }).limit(2);
    const providers = await User.find({ userType: 'service provider' }).limit(2);

    if (users.length < 1 || providers.length < 1) {
      console.log('❌ Need at least 1 user and 1 service provider for testing');
      return;
    }

    const user = users[0];
    const provider = providers[0];

    console.log(`👤 Test User: ${user.name} (${user._id})`);
    console.log(`🔧 Test Provider: ${provider.name} (${provider._id})`);

    // Test creating recent messages
    const conversationId = `${Math.min(user._id.toString(), provider._id.toString())}_${Math.max(user._id.toString(), provider._id.toString())}`;

    // Create recent message from user to provider
    const userToProvider = new RecentMessage({
      userId: user._id,
      providerId: provider._id,
      lastMessage: {
        content: 'Hello, I need your service!',
        senderId: user._id,
        timestamp: new Date()
      },
      conversationId,
      unreadCount: 0
    });

    // Create recent message from provider to user
    const providerToUser = new RecentMessage({
      userId: provider._id,
      providerId: user._id,
      lastMessage: {
        content: 'Hello, I need your service!',
        senderId: user._id,
        timestamp: new Date()
      },
      conversationId,
      unreadCount: 1
    });

    await userToProvider.save();
    await providerToUser.save();

    console.log('✅ Created recent message records');

    // Test querying recent messages for user
    const userMessages = await RecentMessage.find({ userId: user._id })
      .populate('providerId', '_id name occupation userType');
    
    console.log('\n📱 Recent messages for user:');
    userMessages.forEach(msg => {
      console.log(`  - Provider: ${msg.providerId.name} (${msg.providerId.occupation})`);
      console.log(`    Last message: "${msg.lastMessage.content}"`);
      console.log(`    Unread: ${msg.unreadCount}`);
    });

    // Test querying recent messages for provider
    const providerMessages = await RecentMessage.find({ userId: provider._id })
      .populate('userId', '_id name userType');
    
    console.log('\n📱 Recent messages for provider:');
    providerMessages.forEach(msg => {
      console.log(`  - User: ${msg.userId.name}`);
      console.log(`    Last message: "${msg.lastMessage.content}"`);
      console.log(`    Unread: ${msg.unreadCount}`);
    });

    console.log('\n✅ Recent messages test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing recent messages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testRecentMessages();
