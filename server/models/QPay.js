const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const qpaySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  pin: {
    type: String,
    required: true
  },
  pinString: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0.00,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  cashback: {
    type: Number,
    default: 0.00,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash PIN before saving
qpaySchema.pre('save', async function(next) {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 12);
  }
  next();
});

// Method to compare PIN
qpaySchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

// Method to update balance
qpaySchema.methods.updateBalance = function(amount) {
  this.balance = Math.max(0, this.balance + amount);
  return this.save();
};

// Method to update discount
qpaySchema.methods.updateDiscount = function(newDiscount) {
  this.discount = Math.max(0, Math.min(100, newDiscount));
  return this.save();
};

// Method to update cashback
qpaySchema.methods.updateCashback = function(amount) {
  this.cashback = Math.max(0, this.cashback + amount);
  return this.save();
};

// Static method to find by user ID
qpaySchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId, isActive: true });
};

// Index for efficient queries
qpaySchema.index({ userId: 1, isActive: 1 });
qpaySchema.index({ 'lastLogin': -1 });

module.exports = mongoose.model('QPay', qpaySchema);
