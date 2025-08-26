const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  bookingDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  charge: {
    type: Number,
    required: true,
    min: 0
  },
  userAddress: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ serviceProvider: 1, createdAt: -1 });
bookingSchema.index({ bookingDate: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
