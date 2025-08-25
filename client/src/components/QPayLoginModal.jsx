import { useState } from 'react';
import '../styles/QPayLoginModal.css';

const QPayLoginModal = ({ isOpen, onClose, onSuccess }) => {
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
      const response = await fetch('http://localhost:5000/api/qpay/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin: pin })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Invalid PIN');
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
          <h2>QPay Login</h2>
          <button className="close-button" onClick={handleClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="login-icon">
            <i className="bi bi-credit-card"></i>
          </div>
          
          <p className="login-description">
            Enter your 4-digit PIN to access your QPay account
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="loginPin">4-Digit PIN</label>
              <input
                type="password"
                id="loginPin"
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
              className="btn btn-primary login-btn"
              disabled={isSubmitting || pin.length !== 4}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Verifying...
                </>
              ) : (
                'Login to QPay'
              )}
            </button>
          </form>
        </div>
        
        <div className="modal-footer">
          <p>Forgot your PIN? Contact support for assistance.</p>
        </div>
      </div>
    </div>
  );
};

export default QPayLoginModal;
