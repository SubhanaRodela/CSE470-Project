const mongoose = require('mongoose');

const moneyRequestSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  serviceProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  paidDate: {
    type: Date
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
moneyRequestSchema.index({ user: 1, status: 1 });
moneyRequestSchema.index({ serviceProvider: 1, status: 1 });
moneyRequestSchema.index({ booking: 1 });

module.exports = mongoose.model('MoneyRequest', moneyRequestSchema);
