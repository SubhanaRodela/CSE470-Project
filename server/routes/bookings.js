const express = require('express');
const router = express.Router();
const { 
  createBooking, 
  getUserBookings, 
  getServiceProviderBookings, 
  updateBookingStatus 
} = require('../controllers/bookingController');
const { authenticateToken } = require('../middleware/auth');

// Create a new booking (users only)
router.post('/', authenticateToken, createBooking);

// Get user's bookings (users only)
router.get('/user', authenticateToken, getUserBookings);

// Get service provider's bookings (service providers only)
router.get('/service-provider', authenticateToken, getServiceProviderBookings);

// Update booking status (service providers only)
router.put('/:bookingId/status', authenticateToken, updateBookingStatus);

module.exports = router;
