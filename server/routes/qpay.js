const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  registerQPayAccount,
  loginQPayAccount,
  getQPayAccount,
  updateBalance,
  updateDiscount,
  resetQPayPin,
  getProviderDiscount
} = require('../controllers/qpayController');

// Register new QPay account
router.post('/register', authenticateToken, registerQPayAccount);

// Login to QPay account
router.post('/login', authenticateToken, loginQPayAccount);

// Get QPay account details
router.get('/account', authenticateToken, getQPayAccount);

// Update QPay account balance
router.put('/balance', authenticateToken, updateBalance);

// Update QPay account discount (service providers only)
router.put('/discount', authenticateToken, updateDiscount);

// Reset QPay PIN (requires QuickFix password verification)
router.put('/reset-pin', authenticateToken, resetQPayPin);

// Get provider's QPay discount (for payment calculations)
router.get('/provider-discount/:providerId', authenticateToken, getProviderDiscount);

module.exports = router;
