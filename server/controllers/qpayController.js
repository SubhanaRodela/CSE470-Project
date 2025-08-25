const QPay = require('../models/QPay');
const User = require('../models/User');

// Register new QPay account
const registerQPayAccount = async (req, res) => {
  try {
    const { pin, pinString } = req.body;
    const userId = req.user.userId;
    
    console.log('QPay registration request:', { pin, pinString, userId });
    console.log('User from token:', req.user);

    // Validate PIN
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits'
      });
    }

    // Check if user already has a QPay account
    const existingAccount = await QPay.findByUserId(userId);
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'User already has a QPay account'
      });
    }

    // Create new QPay account
    const qpayAccount = new QPay({
      userId,
      pin,
      pinString,
      balance: 0.00,
      discount: 0,
      cashback: 0.00
    });

    await qpayAccount.save();

    res.status(201).json({
      success: true,
      message: 'QPay account created successfully',
      data: {
        id: qpayAccount._id,
        balance: qpayAccount.balance,
        discount: qpayAccount.discount,
        cashback: qpayAccount.cashback,
        createdAt: qpayAccount.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating QPay account:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login to QPay account
const loginQPayAccount = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.userId;

    // Validate PIN
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits'
      });
    }

    // Find QPay account
    const qpayAccount = await QPay.findByUserId(userId);
    if (!qpayAccount) {
      return res.status(404).json({
        success: false,
        message: 'QPay account not found. Please create an account first.'
      });
    }

    // Verify PIN
    const isPinValid = await qpayAccount.comparePin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Update last login
    qpayAccount.lastLogin = new Date();
    await qpayAccount.save();

    res.json({
      success: true,
      message: 'QPay login successful',
      data: {
        id: qpayAccount._id,
        balance: qpayAccount.balance,
        discount: qpayAccount.discount,
        cashback: qpayAccount.cashback,
        lastLogin: qpayAccount.lastLogin
      }
    });

  } catch (error) {
    console.error('Error logging into QPay account:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get QPay account details
const getQPayAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find QPay account
    const qpayAccount = await QPay.findByUserId(userId);
    if (!qpayAccount) {
      return res.status(404).json({
        success: false,
        message: 'QPay account not found'
      });
    }

    res.json({
      success: true,
      message: 'QPay account details retrieved successfully',
      data: {
        id: qpayAccount._id,
        balance: qpayAccount.balance,
        discount: qpayAccount.discount,
        cashback: qpayAccount.cashback,
        lastLogin: qpayAccount.lastLogin,
        createdAt: qpayAccount.createdAt
      }
    });

  } catch (error) {
    console.error('Error retrieving QPay account:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update QPay account balance
const updateBalance = async (req, res) => {
  try {
    const { amount, operation } = req.body;
    const userId = req.user.userId;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operation must be either "add" or "subtract"'
      });
    }

    // Find QPay account
    const qpayAccount = await QPay.findByUserId(userId);
    if (!qpayAccount) {
      return res.status(404).json({
        success: false,
        message: 'QPay account not found'
      });
    }

    // Update balance
    const changeAmount = operation === 'add' ? amount : -amount;
    await qpayAccount.updateBalance(changeAmount);

    res.json({
      success: true,
      message: 'Balance updated successfully',
      data: {
        newBalance: qpayAccount.balance,
        changeAmount: changeAmount
      }
    });

  } catch (error) {
    console.error('Error updating QPay balance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerQPayAccount,
  loginQPayAccount,
  getQPayAccount,
  updateBalance
};
