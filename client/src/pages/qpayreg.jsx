import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/QPayReg.css';

const QPayReg = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    console.log('QPay Registration - User data:', userInfo);
    console.log('QPay Registration - Token:', token ? 'Token exists' : 'No token');
    setUser(userInfo);
    setLoading(false);
  }, [navigate]);

  const handlePinChange = (e, field) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (field === 'pin') {
      setPin(value);
    } else {
      setConfirmPin(value);
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (confirmPin.length !== 4) {
      setError('Confirm PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      console.log('QPay Registration - Sending request with token:', token ? 'Token exists' : 'No token');
      console.log('QPay Registration - Request payload:', { pin, pinString: pin.toString() });
      
      const response = await fetch('http://localhost:5000/api/qpay/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pin: pin,
          pinString: pin.toString()
        })
      });

      const data = await response.json();
      console.log('QPay Registration - Response:', data);

      if (data.success) {
        setSuccess('QPay account created successfully!');
        setTimeout(() => {
          navigate('/pay');
        }, 2000);
      } else {
        setError(data.message || 'Failed to create QPay account');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="qpayreg-container">
      <Navbar />
      <div className="qpayreg-content">
        <div className="qpayreg-header">
          <h1>Create QPay Account</h1>
          <p>Set up your secure 4-digit PIN for QPay</p>
        </div>
        
        <div className="qpayreg-form-container">
          <form onSubmit={handleSubmit} className="qpayreg-form">
            <div className="form-group">
              <label htmlFor="pin">4-Digit PIN</label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => handlePinChange(e, 'pin')}
                placeholder="Enter 4-digit PIN"
                maxLength="4"
                required
                className="pin-input"
              />
              <small>Enter a 4-digit PIN for your QPay account</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPin">Confirm PIN</label>
              <input
                type="password"
                id="confirmPin"
                value={confirmPin}
                onChange={(e) => handlePinChange(e, 'confirmPin')}
                placeholder="Confirm 4-digit PIN"
                maxLength="4"
                required
                className="pin-input"
              />
              <small>Re-enter your PIN to confirm</small>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="bi bi-exclamation-circle"></i>
                {error}
              </div>
            )}
            
            {success && (
              <div className="success-message">
                <i className="bi bi-check-circle"></i>
                {success}
              </div>
            )}
            
            <button
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={isSubmitting || pin.length !== 4 || confirmPin.length !== 4}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                'Create QPay Account'
              )}
            </button>
          </form>
          
          <div className="qpayreg-info">
            <h4>Security Features</h4>
            <ul>
              <li><i className="bi bi-shield-check"></i> PIN is securely hashed</li>
              <li><i className="bi bi-lock"></i> 4-digit numeric PIN required</li>
              <li><i className="bi bi-safe"></i> Secure MongoDB storage</li>
              <li><i className="bi bi-credit-card"></i> Instant account access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QPayReg;
