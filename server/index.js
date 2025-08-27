const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
const chatRoutes = require('./routes/chat');
const bookingRoutes = require('./routes/bookings');
const walletRoutes = require('./routes/wallets');
const recentMessageRoutes = require('./routes/recentMessages');
const qpayRoutes = require('./routes/qpay');
const transactionRoutes = require('./routes/transactions');
const moneyRequestRoutes = require('./routes/moneyRequests');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';
console.log('Attempting to connect to MongoDB at:', mongoUrl);

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log('Database:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Please make sure MongoDB is running on your system');
  console.error('You can start MongoDB with: mongod --dbpath C:\\data\\db');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/recent-messages', recentMessageRoutes);
app.use('/api/qpay', qpayRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/money-requests', moneyRequestRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Rodela API' });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Health check route
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    message: 'Health check', 
    server: 'running',
    database: dbStatus,
    timestamp: new Date().toISOString() 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
