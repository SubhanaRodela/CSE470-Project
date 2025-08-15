const express = require('express');
const router = express.Router();
const { register, login, updateProfile, searchServiceProviders, getAllUsers, getUserById } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Update profile route (protected)
router.put('/update-profile', authenticateToken, updateProfile);

// Search service providers route (public)
router.get('/search-service-providers', searchServiceProviders);

// Test route to get all users (for debugging)
router.get('/all-users', getAllUsers);

// Get user by ID route (public)
router.get('/user/:userId', getUserById);

module.exports = router; 