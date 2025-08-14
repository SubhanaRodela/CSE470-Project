const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  checkIfFavorite,
  getServiceProviderFavorites
} = require('../controllers/favoriteController');

// Add a service provider to favorites
router.post('/', authenticateToken, addToFavorites);

// Remove a service provider from favorites
router.delete('/:serviceProviderId', authenticateToken, removeFromFavorites);

// Get user's favorite service providers
router.get('/user', authenticateToken, getUserFavorites);

// Check if a service provider is in user's favorites
router.get('/check/:serviceProviderId', authenticateToken, checkIfFavorite);

// Get all favorites for a specific service provider (for analytics)
router.get('/service-provider/:serviceProviderId', getServiceProviderFavorites);

module.exports = router; 