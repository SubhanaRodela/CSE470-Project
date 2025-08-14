const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Register user
const register = async (req, res) => {
  try {
    const { name, email, phone, occupation, userType, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate occupation for service providers
    if (userType === 'service provider' && !occupation) {
      return res.status(400).json({ message: 'Occupation is required for service providers' });
    }

    // Create user data object
    const userData = {
      name,
      email,
      phone,
      userType,
      password
    };

    // Only include occupation if user type is service provider
    if (userType === 'service provider') {
      userData.occupation = occupation;
      // Set default location (can be updated later)
      userData.longitude = 0;
      userData.latitude = 0;
    }

    // Create new user
    const user = new User(userData);

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        occupation: user.occupation,
        longitude: user.longitude,
        latitude: user.latitude
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
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
        latitude: user.latitude
      }
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
    const { name, email, phone, password, longitude, latitude } = req.body;

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

    // Update location for service providers
    if (user.userType === 'service provider') {
      if (longitude !== undefined) user.longitude = longitude;
      if (latitude !== undefined) user.latitude = latitude;
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
        latitude: user.latitude
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
      .select('_id name occupation longitude latitude phone')
      .sort({ name: 1 }); // Sort by name alphabetically

    // Transform _id to id for frontend compatibility
    const transformedProviders = serviceProviders.map(provider => ({
      id: provider._id,
      name: provider.name,
      occupation: provider.occupation,
      longitude: provider.longitude,
      latitude: provider.latitude,
      phone: provider.phone
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
    const allUsers = await User.find({}).select('_id name email userType occupation');
    
    // Transform _id to id for frontend compatibility
    const transformedUsers = allUsers.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      occupation: user.occupation
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

module.exports = {
  register,
  login,
  updateProfile,
  searchServiceProviders,
  getAllUsers
}; 