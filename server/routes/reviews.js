const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getServiceProviderReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  dislikeReview,
  getUserReviews
} = require('../controllers/reviewController');

// Get all reviews for a service provider
router.get('/service-provider/:serviceProviderId', getServiceProviderReviews);

// Get user's own reviews
router.get('/user', authenticateToken, getUserReviews);

// Create a new review
router.post('/', authenticateToken, createReview);

// Update a review
router.put('/:reviewId', authenticateToken, updateReview);

// Delete a review
router.delete('/:reviewId', authenticateToken, deleteReview);

// Like a review
router.post('/:reviewId/like', authenticateToken, likeReview);

// Dislike a review
router.post('/:reviewId/dislike', authenticateToken, dislikeReview);

module.exports = router; 