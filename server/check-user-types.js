const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

async function checkUserTypes() {
  try {
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    // Get all users and their types
    const users = await User.find({});
    
    console.log(`\n📊 Total users in database: ${users.length}`);
    
    const userTypes = {};
    users.forEach(user => {
      const type = user.userType || 'unknown';
      if (!userTypes[type]) userTypes[type] = [];
      userTypes[type].push({
        name: user.name,
        email: user.email,
        id: user._id
      });
    });

    console.log('\n👥 User types found:');
    Object.keys(userTypes).forEach(type => {
      console.log(`\n${type.toUpperCase()} (${userTypes[type].length} users):`);
      userTypes[type].forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
      });
    });

  } catch (error) {
    console.error('❌ Error checking user types:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkUserTypes();
