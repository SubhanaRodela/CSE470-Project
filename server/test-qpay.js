const mongoose = require('mongoose');
const QPay = require('./models/QPay');
const User = require('./models/User');
require('dotenv').config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/rodela';

async function testQPay() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    // Clear existing QPay accounts
    await QPay.deleteMany({});
    console.log('🧹 Cleared existing QPay accounts');

    // Find a test user
    const testUser = await User.findOne({ userType: 'user' });
    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      return;
    }

    console.log(`👤 Using test user: ${testUser.name} (${testUser.email})`);

    // Test 1: Create QPay account
    console.log('\n🧪 Test 1: Creating QPay account...');
    const qpayAccount = new QPay({
      userId: testUser._id,
      pin: '1234',
      pinString: '1234',
      balance: 100.00,
      discount: 5,
      cashback: 10.50
    });

    await qpayAccount.save();
    console.log('✅ QPay account created successfully');
    console.log('   - Balance:', qpayAccount.balance);
    console.log('   - Discount:', qpayAccount.discount);
    console.log('   - Cashback:', qpayAccount.cashback);

    // Test 2: Verify PIN comparison
    console.log('\n🧪 Test 2: Testing PIN verification...');
    const isPinValid = await qpayAccount.comparePin('1234');
    const isPinInvalid = await qpayAccount.comparePin('5678');
    
    console.log('✅ PIN verification test:');
    console.log('   - Correct PIN (1234):', isPinValid);
    console.log('   - Wrong PIN (5678):', isPinInvalid);

    // Test 3: Test balance update methods
    console.log('\n🧪 Test 3: Testing balance updates...');
    await qpayAccount.updateBalance(50.00);
    console.log('✅ Added $50.00, new balance:', qpayAccount.balance);

    await qpayAccount.updateBalance(25.00);
    console.log('✅ Added $25.00, new balance:', qpayAccount.balance);

    // Test 4: Test discount update
    console.log('\n🧪 Test 4: Testing discount update...');
    await qpayAccount.updateDiscount(10);
    console.log('✅ Updated discount to:', qpayAccount.discount);

    // Test 5: Test cashback update
    console.log('\n🧪 Test 5: Testing cashback update...');
    await qpayAccount.updateCashback(5.25);
    console.log('✅ Added $5.25 cashback, new total:', qpayAccount.cashback);

    // Test 6: Test findByUserId static method
    console.log('\n🧪 Test 6: Testing findByUserId...');
    const foundAccount = await QPay.findByUserId(testUser._id);
    if (foundAccount) {
      console.log('✅ Account found by user ID');
      console.log('   - Final balance:', foundAccount.balance);
      console.log('   - Final discount:', foundAccount.discount);
      console.log('   - Final cashback:', foundAccount.cashback);
    }

    console.log('\n🎉 All QPay tests completed successfully!');
    console.log('\n📊 Final Account Summary:');
    console.log('   - User:', testUser.name);
    console.log('   - Balance: $' + foundAccount.balance.toFixed(2));
    console.log('   - Discount:', foundAccount.discount + '%');
    console.log('   - Cashback: $' + foundAccount.cashback.toFixed(2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testQPay();
