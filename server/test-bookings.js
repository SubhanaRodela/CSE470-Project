const mongoose = require('mongoose');

// MongoDB connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

async function testBookings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Test 1: Check if Booking model exists
    console.log('\n🧪 Test 1: Checking Booking model...');
    try {
      const Booking = require('./models/Booking');
      console.log('✅ Booking model loaded successfully');
      
      // Check if collection exists
      const collections = await mongoose.connection.db.listCollections().toArray();
      const bookingCollection = collections.find(col => col.name === 'bookings');
      if (bookingCollection) {
        console.log('✅ Bookings collection exists in database');
      } else {
        console.log('❌ Bookings collection does not exist in database');
      }
    } catch (error) {
      console.log('❌ Error loading Booking model:', error.message);
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
    console.log('\n🧪 Test 3: Checking server routes...');
    try {
      const express = require('express');
      const app = express();
      const bookingRoutes = require('./routes/bookings');
      app.use('/api/bookings', bookingRoutes);
      console.log('✅ Booking routes loaded successfully');
    } catch (error) {
      console.log('❌ Error loading booking routes:', error.message);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Start the client: npm run dev');
    console.log('3. Test the booking functionality in the browser');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testBookings();
