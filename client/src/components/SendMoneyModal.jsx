import { useState, useEffect } from 'react';
import '../styles/SendMoneyModal.css';

const SendMoneyModal = ({ isOpen, onClose, onSuccess, paymentDetails }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [loadingDiscount, setLoadingDiscount] = useState(true);

  // Fetch provider's QPay discount when modal opens
  useEffect(() => {
    if (isOpen && paymentDetails.providerId) {
      fetchProviderDiscount();
    }
  }, [isOpen, paymentDetails.providerId]);

  const fetchProviderDiscount = async () => {
    try {
      setLoadingDiscount(true);
      const token = localStorage.getItem('token');
      
      // Fetch provider's QPay account to get their discount
      const response = await fetch(`http://localhost:5000/api/qpay/provider-discount/${paymentDetails.providerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiscount(data.data.discount || 0);
      } else {
        setDiscount(0);
      }
    } catch (error) {
      console.error('Error fetching provider discount:', error);
      setDiscount(0);
    } finally {
      setLoadingDiscount(false);
    }
  };

  if (!isOpen) return null;

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Determine the receiver ID based on payment type
      let receiverId = null;
      
      if (paymentDetails.paymentType === 'moneyRequest' && paymentDetails.requestId) {
        // For money request payments, use the providerId directly from payment details
        if (paymentDetails.providerId) {
          receiverId = paymentDetails.providerId;
          console.log('Using provider ID from payment details for money request:', receiverId);
        } else {
          console.error('No provider ID available for money request payment');
          throw new Error('No provider ID available for money request payment');
        }
      } else if (paymentDetails.providerId) {
        // For regular booking payments
        receiverId = paymentDetails.providerId;
        console.log('Using provider ID from payment details:', receiverId);
      } else {
        throw new Error('No receiver ID available for payment');
      }
      
      if (!receiverId) {
        throw new Error('Could not determine service provider ID');
      }
      
      console.log('Sending money to receiver ID:', receiverId);
      console.log('Payment details being sent:', {
        receiverId,
        amount: paymentDetails.amount,
        amountType: typeof paymentDetails.amount,
        bookingId: paymentDetails.bookingId,
        requestId: paymentDetails.requestId
      });
      
      const response = await fetch('http://localhost:5000/api/transactions/send-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: receiverId,
          amount: paymentDetails.amount,
          bookingId: paymentDetails.bookingId,
          requestId: paymentDetails.requestId,
          pin: pin
        })
      });

      const data = await response.json();
      console.log('Send money response:', data);

      if (data.success) {
        // If this is a money request payment, update the money request status
        if (paymentDetails.paymentType === 'moneyRequest' && paymentDetails.requestId) {
          try {
            console.log('Updating money request status to paid');
            const updateResponse = await fetch(`http://localhost:5000/api/money-requests/${paymentDetails.requestId}/paid`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (updateResponse.ok) {
              console.log('Money request status updated successfully');
            } else {
              console.error('Failed to update money request status');
            }
          } catch (updateError) {
            console.error('Failed to update money request status:', updateError);
          }
        }
        
        alert(`Payment successful! Transaction ID: ${data.data.transactionId}\nYou can download the receipt from the transaction history.`);
        onSuccess();
      } else {
        setError(data.message || 'Failed to send money');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Money</h2>
          <button className="close-button" onClick={handleClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="payment-summary">
            <h4>Payment Summary</h4>
            <div className="summary-item">
              <span>Service:</span>
              <span>{paymentDetails.serviceName}</span>
            </div>
            <div className="summary-item">
              <span>Provider:</span>
              <span>{paymentDetails.providerName}</span>
            </div>
            <div className="summary-item amount">
              <span>Amount:</span>
              <span>৳{paymentDetails.amount}</span>
            </div>
            
            {/* Provider's QPay Discount Information */}
            {loadingDiscount ? (
              <div className="summary-item discount">
                <span>Provider Discount:</span>
                <span className="discount-loading">
                  <i className="bi bi-hourglass-split"></i> Loading...
                </span>
              </div>
            ) : discount > 0 ? (
              <>
                <div className="summary-item discount">
                  <span>Provider Discount:</span>
                  <span className="discount-value">-{discount}%</span>
                </div>
                <div className="summary-item final-amount">
                  <span>Final Amount:</span>
                  <span className="final-amount-value">
                    ৳{(paymentDetails.amount * (1 - discount / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="discount-savings">
                  <i className="bi bi-piggy-bank me-2"></i>
                  You save: ৳{(paymentDetails.amount * (discount / 100)).toFixed(2)}
                </div>
              </>
            ) : (
              <div className="summary-item no-discount">
                <span>Provider Discount:</span>
                <span className="no-discount-value">No discount available</span>
              </div>
            )}
          </div>
          
          <div className="pin-section">
            <h4>Enter Your QPay PIN</h4>
            <p className="pin-description">
              Enter your 4-digit PIN to confirm the payment
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="password"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="Enter PIN"
                  maxLength="4"
                  required
                  className="pin-input"
                  autoFocus
                />
              </div>
              
              {error && (
                <div className="error-message">
                  <i className="bi bi-exclamation-circle"></i>
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="btn btn-primary send-btn"
                disabled={isSubmitting || pin.length !== 4}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  'Send Money'
                )}
              </button>
            </form>
          </div>
        </div>
        
        <div className="modal-footer">
          <p>This payment will be processed securely through QPay</p>
        </div>
      </div>
    </div>
  );
};

export default SendMoneyModal;
