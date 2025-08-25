const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  sendMoney,
  getTransactionHistory,
  getTransactionById,
  downloadReceipt
} = require('../controllers/transactionController');

// Send money to another user
router.post('/send-money', authenticateToken, sendMoney);

// Get transaction history for the authenticated user
router.get('/history', authenticateToken, getTransactionHistory);

// Get specific transaction details
router.get('/:transactionId', authenticateToken, getTransactionById);

// Download transaction receipt
router.get('/:transactionId/receipt', authenticateToken, downloadReceipt);

module.exports = router;
