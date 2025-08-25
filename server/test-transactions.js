const mongoose = require('mongoose');
const TransactionHistory = require('./models/TransactionHistory');
const QPay = require('./models/QPay');
const User = require('./models/User');
const Booking = require('./models/Booking');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/quicfix', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  
  try {
    // Clear existing data
    await TransactionHistory.deleteMany({});
    console.log('🗑️  Cleared existing transactions');
    
    // Find test users
    const users = await User.find({ userType: 'user' }).limit(1);
    const providers = await User.find({ userType: 'service provider' }).limit(1);
    
    if (users.length === 0 || providers.length === 0) {
      console.log('❌ Need at least 1 user and 1 service provider for testing');
      return;
    }
    
    const user = users[0];
    const provider = providers[0];
    
    console.log('👤 Test User:', user.name, user.email);
    console.log('🔧 Test Provider:', provider.name, provider.email);
    
    // Check if users have QPay accounts
    let userQPay = await QPay.findByUserId(user._id);
    let providerQPay = await QPay.findByUserId(provider._id);
    
    if (!userQPay) {
      console.log('💰 Creating QPay account for user...');
      userQPay = new QPay({
        userId: user._id,
        pin: '1234',
        pinString: '1234',
        balance: 1000.00,
        discount: 5,
        cashback: 50.00
      });
      await userQPay.save();
      console.log('✅ User QPay account created');
    }
    
    if (!providerQPay) {
      console.log('💰 Creating QPay account for provider...');
      providerQPay = new QPay({
        userId: provider._id,
        pin: '5678',
        pinString: '5678',
        balance: 500.00,
        discount: 10,
        cashback: 25.00
      });
      await providerQPay.save();
      console.log('✅ Provider QPay account created');
    }
    
    console.log('💰 User balance:', userQPay.balance);
    console.log('💰 Provider balance:', providerQPay.balance);
    
    // Create a test transaction
    console.log('\n📝 Creating test transaction...');
    
    // Generate transaction ID manually for testing
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const transactionId = `TXN${year}${month}${day}${random}`;
    
    const transaction = new TransactionHistory({
      transactionId,
      senderId: user._id,
      receiverId: provider._id,
      amount: 150.00,
      description: 'Payment for plumbing service',
      type: 'payment',
      status: 'completed',
      serviceDetails: {
        serviceName: 'Plumbing Service',
        serviceProvider: provider.name,
        serviceDate: new Date()
      },
      paymentMethod: 'QPay',
      completedAt: new Date()
    });
    
    await transaction.save();
    console.log('✅ Test transaction created:', transaction.transactionId);
    
    // Test transaction queries
    console.log('\n🔍 Testing transaction queries...');
    
    // Get user's transaction history
    const userTransactions = await TransactionHistory.find({
      $or: [
        { senderId: user._id },
        { receiverId: user._id }
      ]
    }).populate('senderId', 'name email').populate('receiverId', 'name email');
    
    console.log('📊 User transactions:', userTransactions.length);
    userTransactions.forEach(t => {
      console.log(`  - ${t.transactionId}: ${t.amount} BDT (${t.status})`);
    });
    
    // Get provider's transaction history
    const providerTransactions = await TransactionHistory.find({
      $or: [
        { senderId: provider._id },
        { receiverId: provider._id }
      ]
    }).populate('senderId', 'name email').populate('receiverId', 'name email');
    
    console.log('📊 Provider transactions:', providerTransactions.length);
    providerTransactions.forEach(t => {
      console.log(`  - ${t.transactionId}: ${t.amount} BDT (${t.status})`);
    });
    
    // Test transaction statistics
    console.log('\n📈 Transaction Statistics:');
    const totalTransactions = await TransactionHistory.countDocuments();
    const completedTransactions = await TransactionHistory.countDocuments({ status: 'completed' });
    const totalAmount = await TransactionHistory.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    console.log(`  - Total transactions: ${totalTransactions}`);
    console.log(`  - Completed transactions: ${completedTransactions}`);
    console.log(`  - Total amount: ${totalAmount[0]?.total || 0} BDT`);
    
    console.log('\n✅ Transaction system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
});
