import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const AdminDashboard = () => {
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
    if (userInfo.userType !== 'admin') {
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
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
              <div className="container-fluid">
                <span className="navbar-brand">Rodela - Admin Panel</span>
                <div className="navbar-nav ms-auto">
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
                  <p className="lead mb-4">User Type: <span className="badge bg-dark">{user.userType}</span></p>
                </div>
                
                <div className="mt-5">
                  <h3>Admin Controls</h3>
                  <div className="row mt-4">
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">User Management</h5>
                          <p className="card-text">Manage all users and service providers.</p>
                          <button className="btn btn-dark">Manage Users</button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">Service Categories</h5>
                          <p className="card-text">Manage service categories and occupations.</p>
                          <button className="btn btn-outline-dark">Manage Categories</button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">Reports & Analytics</h5>
                          <p className="card-text">View platform statistics and reports.</p>
                          <button className="btn btn-outline-dark">View Reports</button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">System Settings</h5>
                          <p className="card-text">Configure platform settings and preferences.</p>
                          <button className="btn btn-outline-dark">Settings</button>
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

export default AdminDashboard; 