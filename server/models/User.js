const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  occupation: {
    type: String,
    required: function() {
      return this.userType === 'service provider';
    },
    enum: [
      'Plumber',
      'Electrician', 
      'Painter',
      'Carpenter',
      'AC/Fridge/Washer Repair Technician',
      'Cleaner',
      'Mechanic',
      'Bike Repairer',
      'General Handyman',
      'Internet Technician',
      'Pest Controller'
    ]
  },
  userType: {
    type: String,
    required: true,
    enum: ['user', 'service provider', 'admin']
  },
  password: {
    type: String,
    required: true
  },
  longitude: {
    type: Number,
    required: false
  },
  latitude: {
    type: Number,
    required: false
  },
  address: {
    type: String,
    required: false,
    trim: true
  },
  charge: {
    type: Number,
    required: function() {
      return this.userType === 'service provider';
    },
    min: 0,
    validate: {
      validator: function(value) {
        return value >= 0;
      },
      message: 'Charge must be a non-negative number'
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 