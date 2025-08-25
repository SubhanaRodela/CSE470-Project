import { useState } from 'react';
import '../styles/SendMoneyModal.css';

const SendMoneyModal = ({ isOpen, onClose, onSuccess, paymentDetails }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await fetch('http://localhost:5000/api/transactions/send-money', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: paymentDetails.providerId,
          amount: paymentDetails.amount,
          bookingId: paymentDetails.bookingId,
          pin: pin
        })
      });

      const data = await response.json();

             if (data.success) {
         alert(`Payment successful! Transaction ID: ${data.data.transactionId}\nYou can download the receipt from the transaction history.`);
         onSuccess();
       } else {
         setError(data.message || 'Failed to send money');
       }
    } catch (error) {
      setError('Network error. Please try again.');
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
