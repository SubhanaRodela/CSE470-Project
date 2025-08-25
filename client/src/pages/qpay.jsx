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
      } else {
        setError('Failed to load QPay account data');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="qpay-container">
        <Navbar />
        <div className="qpay-content">
          <div className="error-container">
            <i className="bi bi-exclamation-triangle error-icon"></i>
            <h2>Error Loading QPay Account</h2>
            <p>{error}</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
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
                             <div className="stat-value">৳{qpayData?.balance || 0.00}</div>
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
            </div>
          </div>
          
          <div className="stat-card cashback-card">
            <div className="stat-icon">
              <i className="bi bi-cash-coin"></i>
            </div>
            <div className="stat-content">
              <h3>Cashback</h3>
              <div className="stat-value">৳{qpayData?.cashback || 0.00}</div>
              <small>Earned cashback in Taka</small>
            </div>
          </div>
        </div>
        
        <div className="qpay-actions">
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
        </div>
        
        <div className="qpay-footer">
          <p>QPay - Secure • Fast • Reliable</p>
        </div>
      </div>
    </div>
  );
};

export default QPay;
