const TransactionHistory = require('../models/TransactionHistory');
const QPay = require('../models/QPay');
const User = require('../models/User');
const Booking = require('../models/Booking');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Send money from user to service provider
const sendMoney = async (req, res) => {
  try {
    const { receiverId, amount, bookingId, pin } = req.body;
    const senderId = req.user.userId;

    console.log('Send money request:', { senderId, receiverId, amount, bookingId });

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

    // Check if sender has sufficient balance
    if (senderQPay.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Get booking details if provided
    let booking = null;
    let serviceDetails = {};
    
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (booking) {
        serviceDetails = {
          serviceName: booking.title,
          serviceProvider: booking.serviceProvider?.name || 'Unknown',
          serviceDate: booking.bookingDate
        };
      }
    }

         // Create transaction record
     const transaction = new TransactionHistory({
       senderId,
       receiverId,
       amount: parseFloat(amount),
       description: `Payment for service: ${serviceDetails.serviceName || 'Service'}`,
       bookingId,
       serviceDetails,
       status: 'pending',
       currency: 'BDT',
       paymentMethod: 'QPay'
     });

         console.log('Transaction object before save:', {
       transactionId: transaction.transactionId,
       senderId: transaction.senderId,
       receiverId: transaction.receiverId,
       amount: transaction.amount,
       amountType: typeof transaction.amount,
       amountValue: transaction.amount
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
    } catch (saveError) {
      console.error('Error saving transaction:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create transaction. Please try again.'
      });
    }

    // Update balances (deduct from sender, add to receiver)
    try {
      await senderQPay.updateBalance(-amount);
      await receiverQPay.updateBalance(amount);
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
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      serviceDetails: transaction.serviceDetails,
      currency: transaction.currency
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

         // Add company logo/header with modern styling
     doc.rect(0, 0, 595, 80)
        .fill('#667eea');
     
     doc.fillColor('white')
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('QuickFix', 50, 25, { align: 'center', width: 495 })
        .moveDown(0.5);

     doc.fontSize(16)
        .font('Helvetica')
        .text('Professional Service Platform', { align: 'center' })
        .moveDown(2);
     
     // Reset fill color for rest of content
     doc.fillColor('black');

         // Add receipt title with modern styling
     doc.moveDown(1);
     doc.rect(50, 100, 495, 40)
        .fill('#f8f9fa');
     
     doc.fillColor('#2c3e50')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', 50, 110, { align: 'center', width: 495 });
     
     doc.fillColor('black');
     doc.moveDown(3);

         // Add transaction details with modern styling
     doc.rect(50, 170, 240, 80)
        .fill('#e3f2fd')
        .stroke('#2196f3');
     
     doc.fillColor('#1976d2')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Transaction Details', 60, 180);
     
     doc.fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(`Transaction ID: ${transaction.transactionId}`, 60, 200)
        .text(`Date: ${new Date(transaction.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, 60, 215)
        .text(`Status: ${transaction.status.toUpperCase()}`, 60, 230)
        .text(`Payment Method: ${transaction.paymentMethod || 'QPay'}`, 60, 245);

         // Add payment information with modern styling
     doc.rect(310, 170, 240, 80)
        .fill('#e8f5e8')
        .stroke('#4caf50');
     
     doc.fillColor('#2e7d32')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Payment Information', 320, 180);
     
     // Ensure amount is properly formatted
     const formattedAmount = typeof transaction.amount === 'number' ? 
       transaction.amount.toFixed(2) : 
       parseFloat(transaction.amount || 0).toFixed(2);
     
     console.log('Amount formatting debug:', {
       originalAmount: transaction.amount,
       originalType: typeof transaction.amount,
       formattedAmount: formattedAmount,
       parsedAmount: parseFloat(transaction.amount || 0)
     });
     
     doc.fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(`Currency: ${transaction.currency || 'BDT'}`, 320, 215)
        .text(`Description: ${transaction.description}`, 320, 230);
     
     // Highlight the amount prominently
     doc.fillColor('#4caf50')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`Amount: ৳${formattedAmount}`, 320, 200);

         // Add sender and receiver information with modern styling
     const isSender = transaction.senderId._id.toString() === userId;
     const otherParty = isSender ? transaction.receiverId : transaction.senderId;
     const currentUser = isSender ? transaction.senderId : transaction.receiverId;

     // User information (who is viewing the receipt)
     doc.rect(50, 280, 240, 80)
        .fill('#fff3e0')
        .stroke('#ff9800');
     
     doc.fillColor('#e65100')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Your Information', 60, 290);
     
     doc.fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${currentUser.name}`, 60, 310)
        .text(`Email: ${currentUser.email}`, 60, 325)
        .text(`Phone: ${currentUser.phone || 'N/A'}`, 60, 340);

     // Other party information
     doc.rect(310, 280, 240, 80)
        .fill('#f3e5f5')
        .stroke('#9c27b0');
     
     doc.fillColor('#6a1b9a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(isSender ? 'Service Provider' : 'Client', 320, 290);
     
     doc.fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${otherParty.name}`, 320, 310)
        .text(`Email: ${otherParty.email}`, 320, 325)
        .text(`Phone: ${otherParty.phone || 'N/A'}`, 320, 340);

         // Add service details if available with modern styling
     if (transaction.serviceDetails?.serviceName) {
       doc.rect(50, 390, 495, 60)
          .fill('#e8faf5')
          .stroke('#00bcd4');
       
       doc.fillColor('#00695c')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Service Details', 60, 400);
       
       doc.fillColor('black')
          .fontSize(10)
          .font('Helvetica')
          .text(`Service: ${transaction.serviceDetails.serviceName}`, 60, 420)
          .text(`Provider: ${transaction.serviceDetails.serviceProvider}`, 60, 435)
          .text(`Service Date: ${transaction.serviceDetails.serviceDate ? 
            new Date(transaction.serviceDetails.serviceDate).toLocaleDateString() : 'N/A'}`, 60, 450);
     }

         // Add footer with modern styling
     const footerY = transaction.serviceDetails?.serviceName ? 480 : 420;
     
     doc.rect(0, footerY, 595, 100)
        .fill('#f5f5f5');
     
     doc.fillColor('#666')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Thank you for using QuickFix!', 50, footerY + 20, { align: 'center', width: 495 })
        .moveDown(0.5);
     
     doc.fontSize(10)
        .font('Helvetica')
        .text('This is an official receipt for your records.', { align: 'center' })
        .moveDown(1)
        .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
     
     // Add QuickFix branding
     doc.fillColor('#667eea')
        .fontSize(14)
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
