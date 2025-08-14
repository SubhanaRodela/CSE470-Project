const mongoose = require('mongoose');

// MongoDB connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

async function testFavoritesSimple() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Test 1: Check if FavoriteProvider model exists
    console.log('\n🧪 Test 1: Checking FavoriteProvider model...');
    try {
      const FavoriteProvider = require('./models/FavoriteProvider');
      console.log('✅ FavoriteProvider model loaded successfully');
      
      // Check if collection exists
      const collections = await mongoose.connection.db.listCollections().toArray();
      const favCollection = collections.find(col => col.name === 'favoriteproviders');
      if (favCollection) {
        console.log('✅ Favorites collection exists in database');
      } else {
        console.log('❌ Favorites collection does not exist in database');
      }
    } catch (error) {
      console.log('❌ Error loading FavoriteProvider model:', error.message);
    }

    // Test 2: Check if User model exists
    console.log('\n🧪 Test 2: Checking User model...');
    try {
      const User = require('./models/User');
      console.log('✅ User model loaded successfully');
      
      // Check if users exist
      const userCount = await User.countDocuments();
      console.log(`✅ Found ${userCount} users in database`);
      
      if (userCount > 0) {
        const users = await User.find().limit(3);
        console.log('Sample users:');
        users.forEach(user => {
          console.log(`  - ${user.name} (${user.userType}) - ID: ${user._id}`);
        });
      }
    } catch (error) {
      console.log('❌ Error loading User model:', error.message);
    }

    // Test 3: Check server routes
    console.log('\n🧪 Test 3: Checking server configuration...');
    try {
      const express = require('express');
      const app = express();
      console.log('✅ Express loaded successfully');
      
      // Try to load routes
      try {
        const favoriteRoutes = require('./routes/favorites');
        console.log('✅ Favorites routes loaded successfully');
      } catch (error) {
        console.log('❌ Error loading favorites routes:', error.message);
      }
      
      try {
        const favoriteController = require('./controllers/favoriteController');
        console.log('✅ Favorites controller loaded successfully');
      } catch (error) {
        console.log('❌ Error loading favorites controller:', error.message);
      }
    } catch (error) {
      console.log('❌ Error loading Express:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('If you see any ❌ errors above, those need to be fixed first.');
    console.log('Make sure MongoDB is running and all files exist.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testFavoritesSimple(); 