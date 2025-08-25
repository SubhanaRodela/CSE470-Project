const mongoose = require('mongoose');

const storeMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  otherUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otherUserName: {
    type: String,
    required: true
  },
  otherUserType: {
    type: String,
    required: true
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
storeMessageSchema.index({ userId: 1, otherUserId: 1 }, { unique: true });
storeMessageSchema.index({ userId: 1, unreadCount: 1 });

module.exports = mongoose.model('StoreMessage', storeMessageSchema);
