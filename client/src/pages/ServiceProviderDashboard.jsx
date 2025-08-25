import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageNotification from '../components/MessageNotification';
import '../styles/Dashboard.css';
import '../styles/BookingModal.css';
import Navbar from './navbar';

const ServiceProviderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    if (userInfo.userType !== 'service provider') {
      navigate('/login');
      return;
    }

    setUser(userInfo);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="container-fluid">
        <div className="row mt-5">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <div className="mt-5">
              <h3 className="text-center mb-4">Manage Your Services</h3>
              <div className="row mt-4">
                <div className="col-md-6 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h5 className="card-title">Orders</h5>
                      <p className="card-text">View and manage incoming service bookings from users.</p>
                      <button 
                        className="btn btn-success"
                        onClick={() => navigate('/orders')}
                      >
                        View Orders
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="card h-100">
                    <div className="card-body">
                      <h5 className="card-title">Earnings</h5>
                      <p className="card-text">Track your earnings and payment history.</p>
                      <button className="btn btn-outline-success">View Earnings</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard; 