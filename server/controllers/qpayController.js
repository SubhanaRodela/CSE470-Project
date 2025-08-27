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

// Update QPay account discount (service providers only)
const updateDiscount = async (req, res) => {
  try {
    const { discount } = req.body;
    const userId = req.user.userId;

    // Validate discount percentage
    if (typeof discount !== 'number' || discount < 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount must be a number between 0 and 100'
      });
    }

    // Check if user is a service provider
    const user = await User.findById(userId);
    if (!user || user.userType !== 'service provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can update discount'
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

    // Update discount
    await qpayAccount.updateDiscount(discount);

    res.json({
      success: true,
      message: 'Discount updated successfully',
      data: {
        newDiscount: qpayAccount.discount,
        previousDiscount: discount
      }
    });

  } catch (error) {
    console.error('Error updating QPay discount:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reset QPay PIN (requires QuickFix password verification)
const resetQPayPin = async (req, res) => {
  try {
    const { quickfixPassword, newPin } = req.body;
    const userId = req.user.userId;

    // Validate new PIN
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be exactly 4 digits'
      });
    }

    // Find user and verify QuickFix password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify QuickFix password
    const isPasswordValid = await user.comparePassword(quickfixPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid QuickFix password'
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

    // Update PIN
    qpayAccount.pin = newPin;
    qpayAccount.pinString = newPin; // Also update pinString if needed
    await qpayAccount.save();

    res.json({
      success: true,
      message: 'QPay PIN updated successfully'
    });

  } catch (error) {
    console.error('Error resetting QPay PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get provider's QPay discount for payment calculations
const getProviderDiscount = async (req, res) => {
  try {
    const { providerId } = req.params;
    const userId = req.user.userId;

    // Validate provider ID
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required'
      });
    }

    // Find provider's QPay account
    const providerQPay = await QPay.findByUserId(providerId);
    if (!providerQPay) {
      return res.status(404).json({
        success: false,
        message: 'Provider QPay account not found'
      });
    }

    // Return provider's discount
    res.json({
      success: true,
      message: 'Provider discount retrieved successfully',
      data: {
        discount: providerQPay.discount || 0
      }
    });

  } catch (error) {
    console.error('Error getting provider discount:', error);
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
  updateBalance,
  updateDiscount,
  resetQPayPin,
  getProviderDiscount
};
