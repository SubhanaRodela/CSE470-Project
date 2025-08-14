const mongoose = require('mongoose');
const Review = require('./models/Review');
const User = require('./models/User');

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  testReviewSystem();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

async function testReviewSystem() {
  try {
    console.log('\n🧪 Testing Review System...\n');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users in database`);

    // Get all service providers
    const serviceProviders = await User.find({ userType: 'service provider' });
    console.log(`Found ${serviceProviders.length} service providers`);

    // Get all reviews
    const reviews = await Review.find({});
    console.log(`Found ${reviews.length} reviews in database`);

    if (reviews.length > 0) {
      console.log('\n📝 Sample Review:');
      const sampleReview = await Review.findById(reviews[0]._id)
        .populate('user', 'name')
        .populate('serviceProvider', 'name occupation');
      
      console.log({
        id: sampleReview._id,
        user: sampleReview.user?.name,
        serviceProvider: sampleReview.serviceProvider?.name,
        occupation: sampleReview.serviceProvider?.occupation,
        comment: sampleReview.comment,
        rating: sampleReview.rating,
        likes: sampleReview.likes.length,
        dislikes: sampleReview.dislikes.length,
        replies: sampleReview.replies.length,
        createdAt: sampleReview.createdAt
      });
    }

    // Test creating a sample review if we have users and service providers
    if (users.length > 0 && serviceProviders.length > 0) {
      const regularUser = users.find(u => u.userType === 'user');
      const serviceProvider = serviceProviders[0];

      if (regularUser && serviceProvider) {
        console.log('\n➕ Creating a sample review...');
        
        const sampleReview = new Review({
          user: regularUser._id,
          serviceProvider: serviceProvider._id,
          comment: 'This is a test review for testing purposes.',
          rating: 5
        });

        await sampleReview.save();
        console.log('✅ Sample review created successfully');
        
        // Clean up
        await Review.findByIdAndDelete(sampleReview._id);
        console.log('🧹 Sample review cleaned up');
      }
    }

    console.log('\n✅ Review system test completed successfully!');
    console.log('\n📋 Available API endpoints:');
    console.log('  GET  /api/reviews/service-provider/:id - Get reviews for a service provider');
    console.log('  POST /api/reviews - Create a new review');
    console.log('  PUT  /api/reviews/:id - Update a review');
    console.log('  DELETE /api/reviews/:id - Delete a review');
    console.log('  POST /api/reviews/:id/like - Like a review');
    console.log('  POST /api/reviews/:id/dislike - Dislike a review');

  } catch (error) {
    console.error('❌ Error testing review system:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
} 