const mongoose = require('mongoose');

const transactionHistorySchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  baseAmount: {
    type: Number,
    min: 0
  },
  discountApplied: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  currency: {
    type: String,
    default: 'BDT'
  },
  type: {
    type: String,
    enum: ['payment', 'refund', 'transfer'],
    default: 'payment'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MoneyRequest'
  },
  serviceDetails: {
    serviceName: String,
    serviceProvider: String,
    serviceDate: Date
  },
  paymentMethod: {
    type: String,
    default: 'QPay'
  },
  transactionFee: {
    type: Number,
    default: 0
  },
  notes: String,
  completedAt: Date
}, {
  timestamps: true
});

// Generate unique transaction ID
transactionHistorySchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transactionId = `TXN${year}${month}${day}${random}`;
  }
  next();
});

// Index for efficient queries
transactionHistorySchema.index({ senderId: 1, createdAt: -1 });
transactionHistorySchema.index({ receiverId: 1, createdAt: -1 });
transactionHistorySchema.index({ status: 1 });
transactionHistorySchema.index({ requestId: 1 });

module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);
