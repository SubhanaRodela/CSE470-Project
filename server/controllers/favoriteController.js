const FavoriteProvider = require('../models/FavoriteProvider');
const User = require('../models/User');

// Add a service provider to favorites
const addToFavorites = async (req, res) => {
  try {
    const { serviceProviderId } = req.body;
    const userId = req.user.userId;

    console.log('Adding to favorites:', { userId, serviceProviderId });

    // Check if user is trying to favorite themselves
    if (userId.toString() === serviceProviderId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself to favorites'
      });
    }

    // Check if service provider exists
    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found'
      });
    }

    // Check if already in favorites
    const existingFavorite = await FavoriteProvider.findOne({
      user: userId,
      serviceProvider: serviceProviderId
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Service provider is already in your favorites'
      });
    }

    // Add to favorites
    const favorite = new FavoriteProvider({
      user: userId,
      serviceProvider: serviceProviderId
    });

    await favorite.save();

    // Populate service provider info for response
    await favorite.populate('serviceProvider', 'name occupation phone');

    res.status(201).json({
      success: true,
      message: 'Service provider added to favorites',
      favorite
    });

  } catch (error) {
    console.error('Error adding to favorites:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service provider is already in your favorites'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error adding to favorites'
    });
  }
};

// Remove a service provider from favorites
const removeFromFavorites = async (req, res) => {
  try {
    const { serviceProviderId } = req.params;
    const userId = req.user.userId;

    console.log('Removing from favorites:', { userId, serviceProviderId });

    // Find and remove the favorite
    const favorite = await FavoriteProvider.findOneAndDelete({
      user: userId,
      serviceProvider: serviceProviderId
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Service provider not found in favorites'
      });
    }

    res.json({
      success: true,
      message: 'Service provider removed from favorites'
    });

  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing from favorites'
    });
  }
};

// Get user's favorite service providers
const getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('Getting favorites for user:', userId);

    const favorites = await FavoriteProvider.find({ user: userId })
      .populate('serviceProvider', 'name occupation phone longitude latitude')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      favorites: favorites.map(fav => ({
        id: fav._id,
        serviceProvider: fav.serviceProvider,
        addedAt: fav.createdAt
      }))
    });

  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting favorites'
    });
  }
};

// Check if a service provider is in user's favorites
const checkIfFavorite = async (req, res) => {
  try {
    const { serviceProviderId } = req.params;
    const userId = req.user.userId;

    const favorite = await FavoriteProvider.findOne({
      user: userId,
      serviceProvider: serviceProviderId
    });

    res.json({
      success: true,
      isFavorite: !!favorite
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking favorite status'
    });
  }
};

// Get all favorites for a specific service provider (for analytics)
const getServiceProviderFavorites = async (req, res) => {
  try {
    const { serviceProviderId } = req.params;

    const favorites = await FavoriteProvider.find({ serviceProvider: serviceProviderId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: favorites.length,
      favorites: favorites.map(fav => ({
        id: fav._id,
        user: fav.user,
        addedAt: fav.createdAt
      }))
    });

  } catch (error) {
    console.error('Error getting service provider favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting service provider favorites'
    });
  }
};

module.exports = {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  checkIfFavorite,
  getServiceProviderFavorites
}; 