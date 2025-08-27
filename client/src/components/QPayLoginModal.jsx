import { useState } from 'react';
import '../styles/QPayLoginModal.css';

const QPayLoginModal = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forgot PIN states
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNewPinModal, setShowNewPinModal] = useState(false);
  const [quickfixPassword, setQuickfixPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pinError, setPinError] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);

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

  // Forgot PIN functions
  const handleForgotPin = () => {
    setShowForgotPinModal(true);
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    
    if (!quickfixPassword) {
      setPasswordError('Please enter your QuickFix password');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/qpay/reset-pin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          quickfixPassword: quickfixPassword,
          newPin: '0000' // Temporary, will be updated in next step
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowPasswordModal(false);
        setShowNewPinModal(true);
        setPasswordError('');
      } else if (response.status === 401) {
        setPasswordError('Invalid QuickFix password');
      } else {
        setPasswordError(data.message || 'Verification failed');
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    setIsResettingPin(true);
    setPinError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/qpay/reset-pin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          quickfixPassword: quickfixPassword,
          newPin: newPin
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowNewPinModal(false);
        setShowForgotPinModal(false);
        setQuickfixPassword('');
        setNewPin('');
        alert('QPay PIN updated successfully!');
      } else {
        setPinError(data.message || 'Failed to update PIN');
      }
    } catch (error) {
      setPinError('Network error. Please try again.');
    } finally {
      setIsResettingPin(false);
    }
  };

  const closeForgotPinFlow = () => {
    setShowForgotPinModal(false);
    setShowPasswordModal(false);
    setShowNewPinModal(false);
    setQuickfixPassword('');
    setNewPin('');
    setPasswordError('');
    setPinError('');
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
          <p>
            <span 
              className="forgot-pin-link"
              onClick={handleForgotPin}
              style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
            >
              Forgot your PIN?
            </span> Click here to reset it.
          </p>
        </div>
      </div>

      {/* Forgot PIN Modal */}
      {showForgotPinModal && (
        <div className="modal-overlay" onClick={closeForgotPinFlow}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset QPay PIN</h3>
              <button className="modal-close" onClick={closeForgotPinFlow}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>To reset your QPay PIN, you'll need to verify your QuickFix account password first.</p>
              <div className="text-center">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowForgotPinModal(false);
                    setShowPasswordModal(true);
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closeForgotPinFlow}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Verify QuickFix Password</h3>
              <button className="modal-close" onClick={closeForgotPinFlow}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleVerifyPassword}>
                <div className="form-group">
                  <label htmlFor="quickfixPassword">QuickFix Password</label>
                  <input
                    type="password"
                    id="quickfixPassword"
                    value={quickfixPassword}
                    onChange={(e) => setQuickfixPassword(e.target.value)}
                    className="form-control"
                    placeholder="Enter your QuickFix password"
                    required
                  />
                </div>
                
                {passwordError && (
                  <div className="error-message">
                    <i className="bi bi-exclamation-circle"></i>
                    {passwordError}
                  </div>
                )}
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={closeForgotPinFlow}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Verify Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New PIN Modal */}
      {showNewPinModal && (
        <div className="modal-overlay" onClick={closeForgotPinFlow}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Set New QPay PIN</h3>
              <button className="modal-close" onClick={closeForgotPinFlow}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdatePin}>
                <div className="form-group">
                  <label htmlFor="newPin">New 4-Digit PIN</label>
                  <input
                    type="password"
                    id="newPin"
                    value={newPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNewPin(value);
                      setPinError('');
                    }}
                    className="pin-input"
                    placeholder="Enter new 4-digit PIN"
                    maxLength="4"
                    required
                  />
                  <small className="form-text">Enter a new 4-digit PIN for your QPay account</small>
                </div>
                
                {pinError && (
                  <div className="error-message">
                    <i className="bi bi-exclamation-circle"></i>
                    {pinError}
                  </div>
                )}
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={closeForgotPinFlow}
                    disabled={isResettingPin}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isResettingPin || newPin.length !== 4}
                  >
                    {isResettingPin ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Updating...
                      </>
                    ) : (
                      'Update PIN'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QPayLoginModal;
