const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createMoneyRequest,
  getUserMoneyRequests,
  getServiceProviderMoneyRequests,
  getMoneyRequestById,
  markAsPaid,
  cancelMoneyRequest
} = require('../controllers/moneyRequestController');

// Test route to verify the API is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Money requests API is working',
    timestamp: new Date().toISOString()
  });
});

// Create a new money request (service providers only)
router.post('/', authenticateToken, createMoneyRequest);

// Get money requests for a user (customers)
router.get('/user', authenticateToken, getUserMoneyRequests);

// Get money requests for a service provider
router.get('/service-provider', authenticateToken, getServiceProviderMoneyRequests);

// Get a single money request by ID (must be last to avoid conflicts)
router.get('/details/:requestId', authenticateToken, getMoneyRequestById);

// Mark money request as paid (users only)
router.put('/:requestId/paid', authenticateToken, markAsPaid);

// Cancel money request (service providers only)
router.put('/:requestId/cancel', authenticateToken, cancelMoneyRequest);

module.exports = router;
