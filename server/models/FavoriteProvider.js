const mongoose = require('mongoose');

const favoriteProviderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  serviceProvider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true });

// Create compound index to prevent duplicate favorites
favoriteProviderSchema.index({ user: 1, serviceProvider: 1 }, { unique: true });

// Create indexes for better query performance
favoriteProviderSchema.index({ user: 1, createdAt: -1 });
favoriteProviderSchema.index({ serviceProvider: 1, createdAt: -1 });

module.exports = mongoose.model('FavoriteProvider', favoriteProviderSchema); 