const mongoose = require('mongoose');

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
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function checkProviders() {
  try {
    console.log('Checking for service providers in database...');
    
    // Check all users
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Check service providers
    const serviceProviders = await User.find({ userType: 'service provider' });
    console.log(`Service providers found: ${serviceProviders.length}`);
    
    if (serviceProviders.length > 0) {
      console.log('Service providers:');
      serviceProviders.forEach((provider, index) => {
        console.log(`${index + 1}. ${provider.name} - ${provider.occupation} (${provider.email})`);
        console.log(`   Location: ${provider.longitude}, ${provider.latitude}`);
      });
    } else {
      console.log('No service providers found in database.');
      console.log('You need to create some test providers first.');
    }
    
  } catch (error) {
    console.error('Error checking providers:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkProviders(); 