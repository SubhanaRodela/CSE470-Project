const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/rodela', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User schema (same as in User.js)
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
    required: function() {
      return this.userType === 'service provider';
    }
  },
  latitude: {
    type: Number,
    required: function() {
      return this.userType === 'service provider';
    }
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

const User = mongoose.model('User', userSchema);

async function createTestProviders() {
  try {
    console.log('Creating test service providers...');

    const testProviders = [
      {
        name: 'John Smith',
        email: 'john.plumber@test.com',
        phone: '+1234567890',
        occupation: 'Plumber',
        userType: 'service provider',
        password: 'password123',
        longitude: -74.0060,
        latitude: 40.7128,
        charge: 75
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.electrician@test.com',
        phone: '+1234567891',
        occupation: 'Electrician',
        userType: 'service provider',
        password: 'password123',
        longitude: -74.0061,
        latitude: 40.7129,
        charge: 85
      },
      {
        name: 'Mike Wilson',
        email: 'mike.painter@test.com',
        phone: '+1234567892',
        occupation: 'Painter',
        userType: 'service provider',
        password: 'password123',
        longitude: -74.0062,
        latitude: 40.7130,
        charge: 60
      },
      {
        name: 'Lisa Brown',
        email: 'lisa.cleaner@test.com',
        phone: '+1234567893',
        occupation: 'Cleaner',
        userType: 'service provider',
        password: 'password123',
        longitude: -74.0063,
        latitude: 40.7131,
        charge: 45
      },
      {
        name: 'David Lee',
        email: 'david.mechanic@test.com',
        phone: '+1234567894',
        occupation: 'Mechanic',
        userType: 'service provider',
        password: 'password123',
        longitude: -74.0064,
        latitude: 40.7132,
        charge: 95
      }
    ];

    for (const provider of testProviders) {
      // Check if provider already exists
      const existingProvider = await User.findOne({ email: provider.email });
      if (!existingProvider) {
        const newProvider = new User(provider);
        await newProvider.save();
        console.log(`✅ Created provider: ${provider.name} - ${provider.occupation}`);
      } else {
        console.log(`⏭️  Provider already exists: ${provider.name}`);
      }
    }

    console.log('✅ Test service providers created successfully!');
    console.log('You can now search for them in the UserDashboard');

  } catch (error) {
    console.error('❌ Error creating test providers:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestProviders(); 