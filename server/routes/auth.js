const express = require('express');
const router = express.Router();
const { register, login, updateProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Update profile route (protected)
router.put('/update-profile', authenticateToken, updateProfile);

module.exports = router; 