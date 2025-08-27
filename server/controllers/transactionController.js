const TransactionHistory = require('../models/TransactionHistory');
const QPay = require('../models/QPay');
const User = require('../models/User');
const Booking = require('../models/Booking');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Calculate discounted amount
const calculateDiscountedAmount = (baseAmount, discountPercentage) => {
  if (discountPercentage <= 0) return baseAmount;
  if (discountPercentage >= 100) return 0;
  
  const discountAmount = (baseAmount * discountPercentage) / 100;
  return Math.max(0, baseAmount - discountAmount);
};

// Send money from user to service provider
const sendMoney = async (req, res) => {
  try {
    const { receiverId, amount, bookingId, requestId, pin } = req.body;
    const senderId = req.user.userId;

    console.log('Send money request:', { senderId, receiverId, amount, bookingId, requestId });
    console.log('Request body:', req.body);
    console.log('User from token:', req.user);

    // Validate input
    if (!receiverId || !amount || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID, amount, and PIN are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Verify sender has QPay account
    const senderQPay = await QPay.findByUserId(senderId);
    if (!senderQPay) {
      return res.status(404).json({
        success: false,
        message: 'Sender QPay account not found'
      });
    }

    // Verify receiver has QPay account
    const receiverQPay = await QPay.findByUserId(receiverId);
    if (!receiverQPay) {
      return res.status(404).json({
        success: false,
        message: 'Receiver QPay account not found'
      });
    }

    // Verify PIN
    const isPinValid = await senderQPay.comparePin(pin);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Get service details and calculate discounted amount
    let booking = null;
    let serviceDetails = {};
    let baseAmount = amount;
    let discountedAmount = amount;
    let discountApplied = 0;
    
    if (bookingId) {
      // Populate to access provider name if needed
      booking = await Booking.findById(bookingId).populate('serviceProvider', 'name');
      if (booking) {
        serviceDetails = {
          serviceName: booking.title,
          serviceProvider: booking.serviceProvider && booking.serviceProvider.name ? booking.serviceProvider.name : 'Unknown',
          serviceDate: booking.bookingDate
        };
        // Use provider's base fare from booking and provider's discount
        baseAmount = parseFloat(booking.charge) || 0;
        if (receiverQPay.discount > 0 && baseAmount > 0) {
          discountedAmount = calculateDiscountedAmount(baseAmount, receiverQPay.discount);
          discountApplied = receiverQPay.discount;
        } else {
          discountedAmount = baseAmount;
          discountApplied = 0;
        }
      }
    } else if (requestId) {
      // Get money request details
      const MoneyRequest = require('../models/MoneyRequest');
      const moneyRequest = await MoneyRequest.findById(requestId)
        .populate('booking', 'title description bookingDate')
        .populate('serviceProvider', 'name');
      
      if (moneyRequest) {
        serviceDetails = {
          serviceName: moneyRequest.booking?.title || 'Service',
          serviceProvider: moneyRequest.serviceProvider?.name || 'Unknown',
          serviceDate: moneyRequest.booking?.bookingDate || new Date()
        };
        // No discount for money requests - use original amount
        baseAmount = amount;
        discountedAmount = amount;
        discountApplied = 0;
      }
    }

    // Check if sender has sufficient balance for the discounted amount
    if (senderQPay.balance < discountedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Ensure amount is properly parsed and validated
    const parsedAmount = parseFloat(discountedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error('Invalid amount detected:', { amount, parsedAmount, isNaN: isNaN(parsedAmount) });
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }
    
    console.log('Amount parsing debug:', {
      originalAmount: amount,
      baseAmount: baseAmount,
      discountedAmount: discountedAmount,
      discountApplied: discountApplied,
      parsedAmount: parsedAmount,
      parsedType: typeof parsedAmount,
      stringified: JSON.stringify(amount),
      parsedStringified: JSON.stringify(parsedAmount)
    });
    
    // Create transaction record with additional amount tracking
    const transaction = new TransactionHistory({
      senderId,
      receiverId,
      amount: parsedAmount,
      baseAmount: baseAmount,
      discountApplied: discountApplied,
      description: requestId ? 
        `Payment for money request: ${serviceDetails.serviceName || 'Service'}` : 
        `Payment for service: ${serviceDetails.serviceName || 'Service'}`,
      bookingId,
      requestId,
      serviceDetails,
      status: 'pending',
      currency: 'BDT',
      paymentMethod: 'QPay'
    });
    
    // Store original amount as a note for debugging
    transaction.notes = `Original request amount: ${amount}, Final amount: ${parsedAmount}, Base amount: ${baseAmount}, Discount: ${discountApplied}%`;

    console.log('Transaction object before save:', {
      transactionId: transaction.transactionId,
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      amount: transaction.amount,
      baseAmount: transaction.baseAmount,
      discountApplied: transaction.discountApplied,
      amountType: typeof transaction.amount,
      amountValue: transaction.amount,
      amountStringified: JSON.stringify(transaction.amount),
      amountToFixed: typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : 'N/A'
    });

    // Ensure transactionId is generated
    if (!transaction.transactionId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      transaction.transactionId = `TXN${year}${month}${day}${random}`;
      console.log('Generated transactionId:', transaction.transactionId);
    }

    try {
      await transaction.save();
      
      // Debug: Check what was actually saved
      console.log('Transaction saved successfully. Database record:', {
        _id: transaction._id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        amountType: typeof transaction.amount,
        amountStringified: JSON.stringify(transaction.amount),
        amountToFixed: typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : 'N/A'
      });
      
    } catch (saveError) {
      console.error('Error saving transaction:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create transaction. Please try again.'
      });
    }

    // Update balances (deduct from sender, add to receiver)
    try {
      await senderQPay.updateBalance(-transaction.amount);
      await receiverQPay.updateBalance(transaction.amount);
    } catch (balanceError) {
      console.error('Error updating balances:', balanceError);
      // If balance update fails, delete the transaction
      await TransactionHistory.findByIdAndDelete(transaction._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to update balances. Please try again.'
      });
    }

    // Update transaction status
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    try {
      await transaction.save();
    } catch (updateError) {
      console.error('Error updating transaction status:', updateError);
      // Continue anyway as the transaction was created successfully
    }

    // Update booking status to 'paid' if booking exists
    if (booking) {
      try {
        booking.status = 'paid';
        await booking.save();
      } catch (bookingError) {
        console.error('Error updating booking status:', bookingError);
        // Continue anyway as the payment was successful
      }
    }

    // Update money request status to 'paid' if requestId exists
    if (requestId) {
      try {
        const MoneyRequest = require('../models/MoneyRequest');
        await MoneyRequest.findByIdAndUpdate(requestId, { 
          status: 'paid',
          paidDate: new Date()
        });
      } catch (moneyRequestError) {
        console.error('Error updating money request status:', moneyRequestError);
        // Continue anyway as the payment was successful
      }
    }

    res.json({
      success: true,
      message: 'Payment sent successfully',
      data: {
        transactionId: transaction.transactionId,
        amount,
        newBalance: senderQPay.balance,
        receiverBalance: receiverQPay.balance
      }
    });

  } catch (error) {
    console.error('Error sending money:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get transaction history for a user
const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, status, limit = 50, page = 1 } = req.query;

    console.log('Get transaction history request:', { userId, type, status, limit, page });

    // Build query
    const query = {
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    if (type) query.type = type;
    if (status) query.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions
    const transactions = await TransactionHistory.find(query)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .populate('bookingId', 'title description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await TransactionHistory.countDocuments(query);

    // Format transactions
    const formattedTransactions = transactions.map(transaction => {
      const isSender = transaction.senderId._id.toString() === userId;
      const otherParty = isSender ? transaction.receiverId : transaction.senderId;
      
      return {
        id: transaction._id,
        transactionId: transaction.transactionId,
        type: isSender ? 'sent' : 'received',
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description,
        otherParty: {
          id: otherParty._id,
          name: otherParty.name,
          email: otherParty.email
        },
        serviceDetails: transaction.serviceDetails,
        paymentMethod: transaction.paymentMethod,
        transactionFee: transaction.transactionFee,
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt
      };
    });

    res.json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        transactions: formattedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalTransactions: total,
          hasNextPage: skip + transactions.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get transaction details by ID
const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    console.log('Get transaction by ID request:', { transactionId, userId });

    const transaction = await TransactionHistory.findById(transactionId)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .populate('bookingId', 'title description');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user is involved in this transaction
    if (transaction.senderId._id.toString() !== userId && 
        transaction.receiverId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const isSender = transaction.senderId._id.toString() === userId;
    const otherParty = isSender ? transaction.receiverId : transaction.senderId;

    const formattedTransaction = {
      id: transaction._id,
      transactionId: transaction.transactionId,
      type: isSender ? 'sent' : 'received',
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      otherParty: {
        id: otherParty._id,
        name: otherParty.name,
        email: otherParty.email
      },
      serviceDetails: transaction.serviceDetails,
      paymentMethod: transaction.paymentMethod,
      transactionFee: transaction.transactionFee,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt
    };

    res.json({
      success: true,
      message: 'Transaction details retrieved successfully',
      data: formattedTransaction
    });

  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

    // Download transaction receipt as PDF
const downloadReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    console.log('Download receipt request:', { transactionId, userId });

    // Find the transaction
    const transaction = await TransactionHistory.findOne({ transactionId: transactionId })
      .populate('senderId', 'name email phone')
      .populate('receiverId', 'name email phone')
      .populate('bookingId', 'title description bookingDate');

    // Get the service provider's charge and discount
    let providerCharge = 0;
    let providerDiscount = 0;
    if (transaction.receiverId) {
      try {
        const User = require('../models/User');
        const provider = await User.findById(transaction.receiverId._id);
        if (provider && provider.charge) {
          providerCharge = parseFloat(provider.charge) || 0;
        }
        const providerQPay = await QPay.findByUserId(transaction.receiverId._id);
        if (providerQPay && typeof providerQPay.discount === 'number') {
          providerDiscount = providerQPay.discount;
        }
      } catch (error) {
        console.error('Error fetching provider charge/discount:', error);
      }
    }
    
    // Fallback to booking charge if provider charge is not available
    if (providerCharge === 0 && transaction.bookingId && transaction.bookingId.charge) {
      providerCharge = parseFloat(transaction.bookingId.charge) || 0;
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    console.log('Transaction data for receipt:', {
      transactionId: transaction.transactionId,
      _id: transaction._id,
      amount: transaction.amount,
      amountType: typeof transaction.amount,
      amountValue: transaction.amount,
      amountStringified: JSON.stringify(transaction.amount),
      amountToFixed: typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : 'N/A',
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      serviceDetails: transaction.serviceDetails,
      currency: transaction.currency,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt
    });

    // Check if user is involved in this transaction
    if (transaction.senderId._id.toString() !== userId && 
        transaction.receiverId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${transaction.transactionId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

         // Add company header
     doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('QuickFix', 50, 50, { align: 'center', width: 495 })
        .moveDown(0.5);

     doc.fontSize(14)
        .font('Helvetica')
        .text('Professional Service Platform', { align: 'center' })
        .moveDown(2);

     // Add receipt title
     doc.fontSize(20)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', { align: 'center' })
        .moveDown(2);

     // Add transaction details
     doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('Transaction Details', 50, 150)
        .moveDown(0.5);

     doc.fontSize(10)
        .font('Helvetica')
        .text(`Transaction ID: ${transaction.transactionId}`)
        .text(`Date: ${new Date(transaction.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`)
        .text(`Status: ${transaction.status.toUpperCase()}`)
        .text(`Payment Method: ${transaction.paymentMethod || 'QPay'}`)
        .moveDown(1);

          // Add payment information
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Payment Information', 50, 220)
       .moveDown(0.5);

    // Always compute values from provider's base fare (Users) and discount (QPay)
    const baseAmount = (providerCharge && !isNaN(parseFloat(providerCharge))) ? parseFloat(providerCharge) : 0;
    const discountApplied = (typeof providerDiscount === 'number' && !isNaN(providerDiscount)) ? providerDiscount : 0;
    const discountedPrice = parseFloat((baseAmount * (discountApplied / 100)).toFixed(2));
    const finalAmount = parseFloat((Math.max(0, baseAmount - discountedPrice)).toFixed(2));

    // Display the amount (final discounted amount)
    const displayAmount = finalAmount;
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(`Amount: BDT ${displayAmount.toFixed(2)}`)
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Currency: ${transaction.currency || 'BDT'}`)
       .text(`Description: ${transaction.description}`)
       .moveDown(0.5);

    // Payment breakdown
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Payment Breakdown:')
       .moveDown(0.3);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Base Amount: BDT ${baseAmount.toFixed(2)}`)
       .text(`Discount Applied: -${discountApplied}%`)
       .text(`Discounted Price: BDT ${discountedPrice.toFixed(2)}`)
       .text(`Final Amount: BDT ${finalAmount.toFixed(2)}`)
       .moveDown(0.5);

    doc.moveDown(0.5);

        // Add sender and receiver information with modern styling
    const isSender = transaction.senderId._id.toString() === userId;
    const otherParty = isSender ? transaction.receiverId : transaction.senderId;
    const currentUser = isSender ? transaction.senderId : transaction.receiverId;

    // User information (who is viewing the receipt)
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Your Information')
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Name: ${currentUser.name}`)
       .text(`Email: ${currentUser.email}`)
       .text(`Phone: ${currentUser.phone || 'N/A'}`)
       .moveDown(1);

    // Other party information
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(isSender ? 'Service Provider' : 'Client')
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Name: ${otherParty.name}`)
       .text(`Email: ${otherParty.email}`)
       .text(`Phone: ${otherParty.phone || 'N/A'}`)
       .moveDown(1);

    // Add service details if available
    if (transaction.serviceDetails?.serviceName) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Service Details')
         .moveDown(0.5);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Service: ${transaction.serviceDetails.serviceName}`)
         .text(`Provider: ${transaction.serviceDetails.serviceProvider}`)
         .text(`Service Date: ${transaction.serviceDetails.serviceDate ? 
           new Date(transaction.serviceDetails.serviceDate).toLocaleDateString() : 'N/A'}`)
         .moveDown(1);
    }

    // Add payment summary
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Payment Summary', { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text(`Total Amount: BDT ${displayAmount.toFixed(2)}`, { align: 'center' })
       .moveDown(0.3);

    // Add footer
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Thank you for using QuickFix!', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text('This is an official receipt for your records.', { align: 'center' })
       .moveDown(1)
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    // Add QuickFix branding
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('QuickFix - Professional Service Platform', { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
    });
  }
};

module.exports = {
  sendMoney,
  getTransactionHistory,
  getTransactionById,
  downloadReceipt
};
