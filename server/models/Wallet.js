const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransactionDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

walletSchema.index({ balance: 1 });
walletSchema.index({ isActive: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
