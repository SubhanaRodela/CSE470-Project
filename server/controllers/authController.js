const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createWallet } = require('./walletController');
const Wallet = require('../models/Wallet'); // Added missing import for Wallet

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Register user
const register = async (req, res) => {
  try {
    const { name, email, phone, occupation, userType, password, longitude, latitude, charge } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password || !userType) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate user type
    if (!['user', 'service provider', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate required fields for service providers
    if (userType === 'service provider') {
      if (!occupation) {
        return res.status(400).json({ message: 'Occupation is required for service providers' });
      }
      if (!charge || parseFloat(charge) < 0) {
        return res.status(400).json({ message: 'Valid service charge is required for service providers' });
      }
    }

    // Create user data object
    const userData = {
      name,
      email,
      phone,
      userType,
      password,
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude)
    };

    // Only include service provider specific fields if user type is service provider
    if (userType === 'service provider') {
      userData.occupation = occupation;
      userData.charge = parseFloat(charge);
    }



    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password: password, // Password is now hashed by User model's pre-save hook
      userType,
      ...(occupation && { occupation }),
      ...(charge !== undefined && { charge }),
      ...(longitude !== undefined && latitude !== undefined && 
          !isNaN(longitude) && !isNaN(latitude) && 
          { longitude, latitude }),
      ...(req.body.address && { address: req.body.address })
    });

    await newUser.save();

    // Create wallet for the new user
    try {
      const wallet = new Wallet({
        userId: newUser._id,
        balance: 0
      });
      await wallet.save();
    } catch (walletError) {
      console.error('Failed to create wallet for user:', newUser._id, walletError);
      // Continue with user creation even if wallet creation fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        userType: newUser.userType
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log('User found:', user.name, 'Type:', user.userType);

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password validation result:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Get user's wallet (optional)
    let walletInfo = null;
    try {
      const { getUserWallet } = require('./walletController');
      const walletResult = await getUserWallet(user._id);
      if (walletResult.success) {
        walletInfo = {
          id: walletResult.wallet._id,
          balance: walletResult.wallet.balance,
          currency: walletResult.wallet.currency
        };
      }
    } catch (walletError) {
      console.error('Failed to get wallet for user:', user._id, walletError);
      // Continue with login even if wallet retrieval fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        occupation: user.occupation,
        longitude: user.longitude,
        latitude: user.latitude,
        address: user.address,
        charge: user.charge
      },
      wallet: walletInfo
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    console.log('Update profile request received');
    console.log('User from token:', req.user);
    console.log('Request body:', req.body);
    
    const userId = req.user.userId;
    const { name, email, phone, password, longitude, latitude, charge, address } = req.body;

    // Find user by ID
    const user = await User.findById(userId);
    console.log('Found user:', user);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Update user fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;

    // Update location for all users
    if (longitude !== undefined) user.longitude = longitude;
    if (latitude !== undefined) user.latitude = latitude;

    // Update charge for service providers
    if (user.userType === 'service provider') {
      if (charge !== undefined && parseFloat(charge) >= 0) user.charge = parseFloat(charge);
    }

    // Update password if provided
    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        occupation: user.occupation,
        longitude: user.longitude,
        latitude: user.latitude,
        charge: user.charge
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};

// Search service providers
const searchServiceProviders = async (req, res) => {
  try {
    const { query } = req.query;
    
    let searchQuery = {};
    
    if (query && query.trim().length >= 2) {
      // If search query provided, filter by name or occupation
      searchQuery = {
        userType: 'service provider',
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { occupation: { $regex: query, $options: 'i' } }
        ]
      };
    } else {
      // If no query or short query, return all service providers
      searchQuery = {
        userType: 'service provider'
      };
    }

    // Search for service providers
    const serviceProviders = await User.find(searchQuery)
      .select('_id name occupation longitude latitude phone charge')
      .sort({ name: 1 }); // Sort by name alphabetically

    // Transform _id to id for frontend compatibility
    const transformedProviders = serviceProviders.map(provider => ({
      id: provider._id,
      name: provider.name,
      occupation: provider.occupation,
      longitude: provider.longitude,
      latitude: provider.latitude,
      phone: provider.phone,
      charge: provider.charge
    }));

    console.log('=== Service Provider Search Debug ===');
    console.log('Search query:', JSON.stringify(searchQuery, null, 2));
    console.log('Found service providers:', serviceProviders.length);
    console.log('Original service providers:', JSON.stringify(serviceProviders, null, 2));
    console.log('Transformed service providers:', JSON.stringify(transformedProviders, null, 2));
    console.log('=====================================');

    res.json({
      message: query ? 'Service providers found' : 'All service providers',
      serviceProviders: transformedProviders
    });

  } catch (error) {
    console.error('Search service providers error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
};

// Test endpoint to check all users
const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find({}).select('_id name email userType occupation charge');
    
    // Transform _id to id for frontend compatibility
    const transformedUsers = allUsers.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      occupation: user.occupation,
      charge: user.charge
    }));
    
    console.log('All users in database:', allUsers.length);
    console.log('Original users:', JSON.stringify(allUsers, null, 2));
    console.log('Transformed users:', JSON.stringify(transformedUsers, null, 2));
    
    res.json({
      message: 'All users retrieved',
      totalUsers: allUsers.length,
      users: transformedUsers
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    const user = await User.findById(userId).select('_id name email userType occupation phone charge');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User retrieved successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        occupation: user.occupation,
        phone: user.phone,
        charge: user.charge
      }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving user' 
    });
  }
};

module.exports = {
  register,
  login,
  updateProfile,
  searchServiceProviders,
  getAllUsers,
  getUserById
}; 