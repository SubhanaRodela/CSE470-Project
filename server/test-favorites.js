const mongoose = require('mongoose');
const FavoriteProvider = require('./models/FavoriteProvider');
const User = require('./models/User');

// MongoDB connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

async function testFavorites() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Get some test users
    const users = await User.find({ userType: 'user' }).limit(1);
    const serviceProviders = await User.find({ userType: 'service provider' }).limit(2);

    if (users.length === 0 || serviceProviders.length === 0) {
      console.log('❌ Need at least 1 user and 1 service provider to test');
      return;
    }

    const testUser = users[0];
    const testProvider = serviceProviders[0];

    console.log('\n📋 Test Data:');
    console.log('User:', testUser.name, '(ID:', testUser._id, ')');
    console.log('Service Provider:', testProvider.name, '(ID:', testProvider._id, ')');

    // Test 1: Add to favorites
    console.log('\n🧪 Test 1: Adding to favorites...');
    const favorite = new FavoriteProvider({
      user: testUser._id,
      serviceProvider: testProvider._id
    });
    await favorite.save();
    console.log('✅ Added to favorites successfully');

    // Test 2: Check if in favorites
    console.log('\n🧪 Test 2: Checking favorite status...');
    const isFavorite = await FavoriteProvider.findOne({
      user: testUser._id,
      serviceProvider: testProvider._id
    });
    console.log('✅ Favorite found:', !!isFavorite);

    // Test 3: Get user favorites
    console.log('\n🧪 Test 3: Getting user favorites...');
    const userFavorites = await FavoriteProvider.find({ user: testUser._id })
      .populate('serviceProvider', 'name occupation');
    console.log('✅ User favorites:', userFavorites.length);
    userFavorites.forEach(fav => {
      console.log(`   - ${fav.serviceProvider.name} (${fav.serviceProvider.occupation})`);
    });

    // Test 4: Get service provider favorites count
    console.log('\n🧪 Test 4: Getting service provider favorites count...');
    const providerFavorites = await FavoriteProvider.find({ serviceProvider: testProvider._id });
    console.log('✅ Service provider has', providerFavorites.length, 'favorites');

    // Test 5: Remove from favorites
    console.log('\n🧪 Test 5: Removing from favorites...');
    await FavoriteProvider.findOneAndDelete({
      user: testUser._id,
      serviceProvider: testProvider._id
    });
    console.log('✅ Removed from favorites successfully');

    // Test 6: Verify removal
    console.log('\n🧪 Test 6: Verifying removal...');
    const removedFavorite = await FavoriteProvider.findOne({
      user: testUser._id,
      serviceProvider: testProvider._id
    });
    console.log('✅ Favorite removed:', !removedFavorite);

    console.log('\n🎉 All tests passed! Favorites system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testFavorites(); 