const MoneyRequest = require('../models/MoneyRequest');
const Booking = require('../models/Booking');
const User = require('../models/User');

// Create a new money request
const createMoneyRequest = async (req, res) => {
  try {
    const { bookingId, amount, description } = req.body;
    const serviceProviderId = req.user.userId;

          // Validate input
      if (!bookingId || !amount || amount <= 0) {
        console.log('Validation failed:', { bookingId, amount, amountType: typeof amount });
        return res.status(400).json({
          success: false,
          message: 'Booking ID and valid amount are required'
        });
      }

      // Ensure amount is a number
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a valid positive number'
        });
      }

    // Check if user is a service provider
    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider || serviceProvider.userType !== 'service provider') {
      return res.status(403).json({
        success: false,
        message: 'Only service providers can create money requests'
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email')
      .populate('serviceProvider', 'name occupation');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

          // Verify the booking belongs to this service provider
      const bookingServiceProviderId = booking.serviceProvider._id || booking.serviceProvider;
      if (bookingServiceProviderId.toString() !== serviceProviderId) {
        return res.status(403).json({
          success: false,
          message: 'You can only request money for your own bookings'
        });
      }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only request money for completed bookings'
      });
    }

          // Check if a money request already exists for this booking
      const existingRequest = await MoneyRequest.findOne({ booking: bookingId });
      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'Money request already exists for this booking'
        });
      }

      console.log('Creating money request:', {
        bookingId,
        serviceProviderId,
        userId: booking.user._id,
        originalAmount: amount,
        originalAmountType: typeof amount,
        numericAmount: numericAmount,
        numericAmountType: typeof numericAmount,
        numericAmountStringified: JSON.stringify(numericAmount),
        description: description || `Payment request for ${booking.title}`
      });

          // Create the money request
      const moneyRequest = new MoneyRequest({
        booking: bookingId,
        serviceProvider: serviceProviderId,
        user: booking.user._id,
        amount: numericAmount,
        description: description || `Payment request for ${booking.title}`
      });

    await moneyRequest.save();
    
    // Debug: Check what was actually saved
    console.log('Money request saved successfully. Database record:', {
      _id: moneyRequest._id,
      amount: moneyRequest.amount,
      amountType: typeof moneyRequest.amount,
      amountStringified: JSON.stringify(moneyRequest.amount),
      amountToFixed: typeof moneyRequest.amount === 'number' ? moneyRequest.amount.toFixed(2) : 'N/A'
    });

    // Update booking status to 'request'
    await Booking.findByIdAndUpdate(bookingId, { status: 'request' });

    res.status(201).json({
      success: true,
      message: 'Money request created successfully',
      data: {
        id: moneyRequest._id,
        amount: moneyRequest.amount,
        status: moneyRequest.status,
        requestDate: moneyRequest.requestDate
      }
    });

  } catch (error) {
    console.error('Error creating money request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get money requests for a user (customer)
const getUserMoneyRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const moneyRequests = await MoneyRequest.find({ user: userId, status: 'pending' })
      .populate('booking', 'title description bookingDate')
      .populate('serviceProvider', 'name occupation')
      .sort({ requestDate: -1 });

    console.log('User money requests found:', moneyRequests.map(req => ({
      id: req._id,
      amount: req.amount,
      amountType: typeof req.amount,
      amountStringified: JSON.stringify(req.amount),
      amountToFixed: typeof req.amount === 'number' ? req.amount.toFixed(2) : 'N/A',
      status: req.status,
      serviceProvider: req.serviceProvider?.name,
      booking: req.booking?.title
    })));

    res.json({
      success: true,
      data: moneyRequests
    });

  } catch (error) {
    console.error('Error fetching user money requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get money requests for a service provider
const getServiceProviderMoneyRequests = async (req, res) => {
  try {
    const serviceProviderId = req.user.userId;

    const moneyRequests = await MoneyRequest.find({ serviceProvider: serviceProviderId })
      .populate('booking', 'title description bookingDate')
      .populate('user', 'name email')
      .sort({ requestDate: -1 });

    res.json({
      success: true,
      data: moneyRequests
    });

  } catch (error) {
    console.error('Error fetching service provider money requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get a single money request by ID
const getMoneyRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    
    console.log('getMoneyRequestById called with:', { requestId, userId });
    console.log('Full user object from token:', req.user);

    const moneyRequest = await MoneyRequest.findById(requestId)
      .populate('booking', 'title description bookingDate')
      .populate('serviceProvider', 'name email phone occupation')
      .populate('user', 'name email phone');

    console.log('Found money request:', moneyRequest);

    if (!moneyRequest) {
      console.log('Money request not found for ID:', requestId);
      return res.status(404).json({
        success: false,
        message: 'Money request not found'
      });
    }

    // Verify the user owns this money request
    const moneyRequestUserId = moneyRequest.user._id ? moneyRequest.user._id.toString() : moneyRequest.user.toString();
    const requestingUserId = userId.toString();
    
    console.log('Checking ownership:', { 
      moneyRequestUserId, 
      requestingUserId,
      isOwner: moneyRequestUserId === requestingUserId,
      moneyRequestUserType: typeof moneyRequest.user,
      moneyRequestUserIdType: typeof moneyRequestUserId,
      requestingUserIdType: typeof requestingUserId
    });
    
    if (moneyRequestUserId !== requestingUserId) {
      console.log('Access denied - user does not own this money request');
      console.log('Money request user ID:', moneyRequestUserId);
      console.log('Requesting user ID:', requestingUserId);
      return res.status(403).json({
        success: false,
        message: 'You can only view your own money requests'
      });
    }

    console.log('Sending money request data to user');
    res.json({
      success: true,
      data: moneyRequest
    });

  } catch (error) {
    console.error('Error fetching money request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mark money request as paid
const markAsPaid = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const moneyRequest = await MoneyRequest.findById(requestId)
      .populate('booking')
      .populate('serviceProvider');

    if (!moneyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Money request not found'
      });
    }

    // Verify the user owns this money request
    if (moneyRequest.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay for your own money requests'
      });
    }

    // Check if already paid
    if (moneyRequest.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Money request is already paid'
      });
    }

    // Update money request status
    moneyRequest.status = 'paid';
    moneyRequest.paidDate = new Date();
    await moneyRequest.save();

    // Update booking status to 'paid' or similar
    await Booking.findByIdAndUpdate(moneyRequest.booking._id, { status: 'paid' });

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        id: moneyRequest._id,
        amount: moneyRequest.amount,
        status: moneyRequest.status,
        paidDate: moneyRequest.paidDate
      }
    });

  } catch (error) {
    console.error('Error marking money request as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cancel money request (service provider only)
const cancelMoneyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const serviceProviderId = req.user.userId;

    const moneyRequest = await MoneyRequest.findById(requestId);

    if (!moneyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Money request not found'
      });
    }

    // Verify the service provider owns this money request
    if (moneyRequest.serviceProvider.toString() !== serviceProviderId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own money requests'
      });
    }

    // Check if already paid
    if (moneyRequest.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a paid money request'
      });
    }

    // Update money request status
    moneyRequest.status = 'cancelled';
    await moneyRequest.save();

    // Revert booking status to 'completed'
    await Booking.findByIdAndUpdate(moneyRequest.booking, { status: 'completed' });

    res.json({
      success: true,
      message: 'Money request cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling money request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createMoneyRequest,
  getUserMoneyRequests,
  getServiceProviderMoneyRequests,
  getMoneyRequestById,
  markAsPaid,
  cancelMoneyRequest
};
