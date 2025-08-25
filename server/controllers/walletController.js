const Wallet = require('../models/Wallet');

const createWallet = async (userId) => {
  try {
    const existingWallet = await Wallet.findOne({ userId });
    if (existingWallet) {
      return { success: false, message: 'Wallet already exists for this user' };
    }

    const wallet = new Wallet({
      userId,
      balance: 0,
      currency: 'USD',
      isActive: true
    });

    await wallet.save();
    return { success: true, wallet, message: 'Wallet created successfully' };
  } catch (error) {
    console.error('Error creating wallet:', error);
    return { success: false, message: 'Failed to create wallet' };
  }
};

const getUserWallet = async (userId) => {
  try {
    const wallet = await Wallet.findOne({ userId, isActive: true });
    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }
    return { success: true, wallet };
  } catch (error) {
    console.error('Error getting user wallet:', error);
    return { success: false, message: 'Failed to get wallet' };
  }
};

const updateWalletBalance = async (userId, amount, operation = 'add') => {
  try {
    // Validate amount parameter
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return { success: false, message: 'Invalid amount: must be a positive number' };
    }

    const wallet = await Wallet.findOne({ userId, isActive: true });
    if (!wallet) {
      return { success: false, message: 'Wallet not found' };
    }

    if (operation === 'add') {
      wallet.balance += numericAmount;
    } else if (operation === 'subtract') {
      if (wallet.balance < numericAmount) {
        return { success: false, message: 'Insufficient balance' };
      }
      wallet.balance -= numericAmount;
    }

    wallet.lastTransactionDate = new Date();
    await wallet.save();

    return { success: true, wallet, message: 'Wallet balance updated successfully' };
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    return { success: false, message: 'Failed to update wallet balance' };
  }
};

module.exports = {
  createWallet,
  getUserWallet,
  updateWalletBalance
};
