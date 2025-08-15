import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageNotification from '../components/MessageNotification';
import '../styles/Dashboard.css';

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
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <nav className="navbar navbar-expand-lg navbar-dark bg-success">
              <div className="container-fluid">
                <span className="navbar-brand">Rodela - Service Provider</span>
                <div className="navbar-nav ms-auto">
                  <MessageNotification userType={user?.userType} />
                  <button 
                    className="btn btn-outline-light"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>

        <div className="row mt-5">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <div className="card shadow-lg">
              <div className="card-body p-5 text-center">
                <h1 className="display-4 mb-4">Welcome!</h1>
                <div className="user-info">
                  <h2 className="mb-3">Hi, {user.name}</h2>
                  <p className="lead mb-4">User Type: <span className="badge bg-success">{user.userType}</span></p>
                </div>
                
                <div className="mt-5">
                  <h3>Manage Your Services</h3>
                  <div className="row mt-4">
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">Service Requests</h5>
                          <p className="card-text">View and respond to incoming service requests.</p>
                          <button className="btn btn-success">View Requests</button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">My Schedule</h5>
                          <p className="card-text">Manage your availability and appointments.</p>
                          <button className="btn btn-outline-success">Manage Schedule</button>
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
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">Profile Settings</h5>
                          <p className="card-text">Update your profile and service information.</p>
                          <button 
                            className="btn btn-outline-success"
                            onClick={() => navigate('/profile')}
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>
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