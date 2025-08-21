const Booking = require('../models/Booking');
const User = require('../models/User');

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { serviceProviderId, title, description, bookingDate } = req.body;
    const userId = req.user.userId;

    if (!serviceProviderId || !title || !description || !bookingDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: serviceProviderId, title, description, bookingDate' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const serviceProvider = await User.findById(serviceProviderId);
    if (!serviceProvider || serviceProvider.userType !== 'service provider') {
      return res.status(404).json({ 
        success: false, 
        message: 'Service provider not found' 
      });
    }

    if (userId === serviceProviderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Users cannot book themselves' 
      });
    }

    const parsedDate = new Date(bookingDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format' 
      });
    }

    if (parsedDate < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking date cannot be in the past' 
      });
    }

    const booking = new Booking({
      user: userId,
      serviceProvider: serviceProviderId,
      title,
      description,
      bookingDate: parsedDate
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('serviceProvider', 'name email phone occupation');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: populatedBooking
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating booking' 
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await Booking.find({ user: userId })
      .populate('serviceProvider', 'name email phone occupation')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching bookings' 
    });
  }
};

// Get service provider's bookings
const getServiceProviderBookings = async (req, res) => {
  try {
    const serviceProviderId = req.user.userId;

    const user = await User.findById(serviceProviderId);
    if (!user || user.userType !== 'service provider') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only service providers can view their bookings.' 
      });
    }

    const bookings = await Booking.find({ serviceProvider: serviceProviderId })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Error fetching service provider bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching bookings' 
    });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const serviceProviderId = req.user.userId;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: pending, confirmed, completed, cancelled' 
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    if (booking.serviceProvider.toString() !== serviceProviderId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You can only update your own bookings.' 
      });
    }

    booking.status = status;
    await booking.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('user', 'name email phone')
      .populate('serviceProvider', 'name email phone occupation');

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating booking status' 
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getServiceProviderBookings,
  updateBookingStatus
};
