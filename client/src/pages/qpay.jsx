import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/QPay.css';

const QPay = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qpayData, setQpayData] = useState(null);
  const [error, setError] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [updatingDiscount, setUpdatingDiscount] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    console.log('QPay Dashboard - User data:', userInfo);
    setUser(userInfo);
    loadQPayData(token);
  }, [navigate]);

  const loadQPayData = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/qpay/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQpayData(data.data);
        setDiscountValue(data.data.discount || 0);
      } else if (response.status === 404) {
        // QPay account doesn't exist yet
        setQpayData(null);
        setError('QPay account not found. Please create an account first.');
      } else {
        setError('Failed to load QPay account data');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDiscount = async () => {
    if (discountValue < 0 || discountValue > 100) {
      alert('Discount must be between 0 and 100');
      return;
    }

    setUpdatingDiscount(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/qpay/discount', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ discount: discountValue })
      });

      if (response.ok) {
        const data = await response.json();
        setQpayData(prev => ({ ...prev, discount: discountValue }));
        setShowDiscountModal(false);
        alert('Discount updated successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update discount');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setUpdatingDiscount(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (error) {
    const isAccountNotFound = error.includes('QPay account not found');
    
    return (
      <div className="qpay-container">
        <Navbar />
        <div className="qpay-content">
          <div className="error-container">
            <i className="bi bi-exclamation-triangle error-icon"></i>
            <h2>{isAccountNotFound ? 'QPay Account Not Found' : 'Error Loading QPay Account'}</h2>
            <p>{error}</p>
            <div className="error-actions">
              {isAccountNotFound && (
                <button 
                  className="btn btn-primary me-2"
                  onClick={() => navigate('/qpayreg')}
                >
                  Create QPay Account
                </button>
              )}
              <button 
                className="btn btn-outline-secondary"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qpay-container">
      <Navbar />
      <div className="qpay-content">
        <div className="qpay-header">
          <h1>QPay Dashboard</h1>
          <p>Welcome to your secure payment system</p>
        </div>
        
        <div className="qpay-stats">
          <div className="stat-card balance-card">
            <div className="stat-icon">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="stat-content">
              <h3>Balance</h3>
              <div className="stat-value">{qpayData?.balance || 0.00}</div>
              <small>Available balance in Taka</small>
            </div>
          </div>
          
          <div className="stat-card discount-card">
            <div className="stat-icon">
              <i className="bi bi-tag"></i>
            </div>
            <div className="stat-content">
              <h3>Discount</h3>
              <div className="stat-value">{qpayData?.discount || 0}%</div>
              <small>Current discount rate</small>
              {user.userType === 'service provider' && (
                <button 
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={() => setShowDiscountModal(true)}
                >
                  <i className="bi bi-pencil me-1"></i>
                  Edit Discount
                </button>
              )}
            </div>
          </div>
          
          {/* <div className="stat-card cashback-card">
            <div className="stat-icon">
              <i className="bi bi-cash-coin"></i>
            </div>
            <div className="stat-content">
              <h3>Cashback</h3>
              <div className="stat-value">{qpayData?.cashback || 0.00}</div>
              <small>Earned cashback in Taka</small>
            </div>
          </div> */}
        </div>
        
        {/* <div className="qpay-actions">
          <div className="action-card">
            <div className="action-icon">
              <i className="bi bi-arrow-up-circle"></i>
            </div>
            <h4>Send Money</h4>
            <p>Transfer Taka to other users</p>
            <button className="btn btn-primary">Send Money</button>
          </div>
          
          <div className="action-card">
            <div className="action-icon">
              <i className="bi bi-arrow-down-circle"></i>
            </div>
            <h4>Receive Money</h4>
            <p>Get Taka payments from others</p>
            <button className="btn btn-success">Receive Money</button>
          </div>
          
          <div className="action-card">
            <div className="action-icon">
              <i className="bi bi-clock-history"></i>
            </div>
            <h4>Transaction History</h4>
            <p>View your payment history</p>
            <button className="btn btn-info">View History</button>
          </div>
          
          <div className="action-card">
            <div className="action-icon">
              <i className="bi bi-gear"></i>
            </div>
            <h4>Settings</h4>
            <p>Manage your QPay account</p>
            <button className="btn btn-warning">Settings</button>
          </div>
        </div> */}
        
        <div className="qpay-footer">
          <p>QPay - Secure • Fast • Reliable</p>
        </div>
      </div>

      {/* Discount Edit Modal */}
      {showDiscountModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Discount</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDiscountModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Set your discount percentage for customers (0-100%)</p>
              <div className="form-group">
                <label htmlFor="discount">Discount Percentage:</label>
                <input
                  type="number"
                  id="discount"
                  min="0"
                  max="100"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                  className="form-control"
                  placeholder="Enter discount percentage"
                />
                <small className="form-text">
                  {discountValue > 0 
                    ? `Customers will pay ${100 - discountValue}% of the original price`
                    : 'No discount applied'
                  }
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDiscountModal(false)}
                disabled={updatingDiscount}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUpdateDiscount}
                disabled={updatingDiscount}
              >
                {updatingDiscount ? 'Updating...' : 'Update Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QPay;
