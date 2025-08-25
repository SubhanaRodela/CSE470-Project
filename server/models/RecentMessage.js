const mongoose = require('mongoose');

const recentMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient querying
recentMessageSchema.index({ userId: 1, providerId: 1 }, { unique: true });
recentMessageSchema.index({ userId: 1, 'lastMessage.timestamp': -1 });
recentMessageSchema.index({ providerId: 1, 'lastMessage.timestamp': -1 });

module.exports = mongoose.model('RecentMessage', recentMessageSchema);
