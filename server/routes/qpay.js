const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  registerQPayAccount,
  loginQPayAccount,
  getQPayAccount,
  updateBalance
} = require('../controllers/qpayController');

// Register new QPay account
router.post('/register', authenticateToken, registerQPayAccount);

// Login to QPay account
router.post('/login', authenticateToken, loginQPayAccount);

// Get QPay account details
router.get('/account', authenticateToken, getQPayAccount);

// Update QPay account balance
router.put('/balance', authenticateToken, updateBalance);

module.exports = router;
