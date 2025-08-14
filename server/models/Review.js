const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  parentReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    comment: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
reviewSchema.index({ serviceProvider: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ parentReview: 1, createdAt: -1 });

// Virtual for like/dislike counts
reviewSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

reviewSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

reviewSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema); 