const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

router.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await walletController.getUserWallet(req.user.userId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error getting user wallet:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const result = await walletController.createWallet(req.user.userId);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
