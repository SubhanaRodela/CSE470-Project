const Review = require('../models/Review');
const User = require('../models/User');

// Get all reviews for a service provider
const getServiceProviderReviews = async (req, res) => {
  try {
    const { serviceProviderId } = req.params;
    
    const reviews = await Review.find({ 
      serviceProvider: serviceProviderId,
      parentReview: null // Only get main reviews, not replies
    })
    .populate('user', 'name')
    .populate('replies')
    .populate({
      path: 'replies',
      populate: {
        path: 'user',
        select: 'name'
      }
    })
    .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
};

// Create a new review
const createReview = async (req, res) => {
  try {
    const { serviceProviderId, comment, rating, parentReviewId } = req.body;
    const userId = req.user.userId; // JWT contains userId, not id

    console.log('User object from JWT:', req.user);
    console.log('User ID type:', typeof userId, userId);

    console.log('Creating review with data:', {
      serviceProviderId,
      comment,
      rating,
      parentReviewId,
      userId,
      body: req.body
    });

    // Validate required fields
    if (!serviceProviderId) {
      return res.status(400).json({
        success: false,
        message: 'Service provider ID is required'
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }

    // Check if user is trying to review themselves
    if (userId.toString() === serviceProviderId.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'You cannot review yourself' 
      });
    }

    // Check if user already reviewed this service provider (for main reviews only)
    if (!parentReviewId) {
      console.log('Checking for existing review with:', {
        user: userId,
        serviceProvider: serviceProviderId
      });
      
      const existingReview = await Review.findOne({
        user: userId,
        serviceProvider: serviceProviderId,
        parentReview: null
      });

      console.log('Existing review found:', existingReview);

      if (existingReview) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already reviewed this service provider' 
        });
      }
    }

    const reviewData = {
      user: userId,
      serviceProvider: serviceProviderId,
      comment,
      rating: rating || 5
    };

    console.log('Review data to save:', reviewData);

    if (parentReviewId) {
      reviewData.parentReview = parentReviewId;
    }

    const review = new Review(reviewData);
    console.log('Review model instance:', review);
    
    await review.save();
    console.log('Review saved successfully:', review._id);

    // If this is a reply, add it to the parent review's replies array
    if (parentReviewId) {
      const parentReview = await Review.findById(parentReviewId);
      if (parentReview) {
        parentReview.replies.push(review._id);
        await parentReview.save();
      }
    }

    // Populate user info for response
    await review.populate('user', 'name');

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment, rating } = req.body;
    const userId = req.user.userId; // JWT contains userId, not id

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only edit your own reviews' 
      });
    }

    // Store edit history
    if (review.comment !== comment) {
      review.editHistory.push({
        comment: review.comment,
        editedAt: new Date()
      });
      review.isEdited = true;
    }

    review.comment = comment;
    if (rating) review.rating = rating;
    
    await review.save();
    await review.populate('user', 'name');

    res.json({ success: true, review });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, message: 'Error updating review' });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId; // JWT contains userId, not id

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if user owns this review
    if (review.user.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own reviews' 
      });
    }

    // If it's a main review, delete all replies too
    if (!review.parentReview) {
      await Review.deleteMany({ parentReview: reviewId });
    } else {
      // If it's a reply, remove it from parent review's replies array
      const parentReview = await Review.findById(review.parentReview);
      if (parentReview) {
        parentReview.replies = parentReview.replies.filter(
          replyId => replyId.toString() !== reviewId
        );
        await parentReview.save();
      }
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Error deleting review' });
  }
};

// Like a review
const likeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId; // JWT contains userId, not id

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if user already liked
    const alreadyLiked = review.likes.includes(userId);
    const alreadyDisliked = review.dislikes.includes(userId);

    if (alreadyLiked) {
      // Unlike
      review.likes = review.likes.filter(id => id.toString() !== userId);
    } else {
      // Like
      review.likes.push(userId);
      // Remove dislike if exists
      if (alreadyDisliked) {
        review.dislikes = review.dislikes.filter(id => id.toString() !== userId);
      }
    }

    await review.save();
    await review.populate('user', 'name');

    res.json({ success: true, review });
  } catch (error) {
    console.error('Error liking review:', error);
    res.status(500).json({ success: false, message: 'Error liking review' });
  }
};

// Dislike a review
const dislikeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId; // JWT contains userId, not id

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: 'Review not found' 
      });
    }

    // Check if user already disliked
    const alreadyDisliked = review.dislikes.includes(userId);
    const alreadyLiked = review.likes.includes(userId);

    if (alreadyDisliked) {
      // Remove dislike
      review.dislikes = review.dislikes.filter(id => id.toString() !== userId);
    } else {
      // Dislike
      review.dislikes.push(userId);
      // Remove like if exists
      if (alreadyLiked) {
        review.likes = review.likes.filter(id => id.toString() !== userId);
      }
    }

    await review.save();
    await review.populate('user', 'name');

    res.json({ success: true, review });
  } catch (error) {
    console.error('Error disliking review:', error);
    res.status(500).json({ success: false, message: 'Error disliking review' });
  }
};

// Get user's reviews
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId; // JWT contains userId, not id
    
    const reviews = await Review.find({ user: userId })
      .populate('serviceProvider', 'name occupation')
      .populate('parentReview')
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ success: false, message: 'Error fetching user reviews' });
  }
};

module.exports = {
  getServiceProviderReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  dislikeReview,
  getUserReviews
}; 