import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageNotification from '../components/MessageNotification';
import '../styles/Dashboard.css';
import '../styles/BookingModal.css';

const ServiceProviderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [expandedBooking, setExpandedBooking] = useState(null);

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

  const loadBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/bookings/service-provider', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setBookings(data.bookings);
      } else {
        console.error('Failed to load bookings:', data.message);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookingExpansion = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        setBookings(prev => prev.map(booking => 
          booking._id === bookingId ? { ...booking, status: newStatus } : booking
        ));
      } else {
        console.error('Failed to update booking status:', data.message);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

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
                          <h5 className="card-title">Orders</h5>
                          <p className="card-text">View and manage incoming service bookings from users.</p>
                          <button 
                            className="btn btn-success"
                            onClick={() => {
                              setShowBookings(!showBookings);
                              if (!showBookings) {
                                loadBookings();
                              }
                            }}
                          >
                            {showBookings ? 'Hide Orders' : 'View Orders'}
                          </button>
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

                {/* Bookings List */}
                {showBookings && (
                  <div className="mt-5">
                    <div className="card">
                      <div className="card-header">
                        <h4 className="mb-0">
                          <i className="bi bi-list-ul me-2"></i>
                          Service Bookings
                        </h4>
                      </div>
                      <div className="card-body">
                        {loading ? (
                          <div className="text-center py-4">
                            <div className="spinner-border text-success" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2">Loading bookings...</p>
                          </div>
                        ) : bookings.length > 0 ? (
                          <div className="bookings-list">
                            {bookings.map((booking) => (
                              <div key={booking._id} className="booking-item">
                                <div 
                                  className="booking-header"
                                  onClick={() => toggleBookingExpansion(booking._id)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="booking-info">
                                    <h6 className="mb-1">{booking.title}</h6>
                                    <p className="mb-1 text-muted">
                                      <strong>Client:</strong> {booking.user.name}
                                    </p>
                                    <p className="mb-0 text-muted">
                                      <strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="booking-status">
                                    <span className={`badge bg-${getStatusColor(booking.status)}`}>
                                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </span>
                                    <i className={`bi bi-chevron-${expandedBooking === booking._id ? 'up' : 'down'} ms-2`}></i>
                                  </div>
                                </div>
                                
                                {expandedBooking === booking._id && (
                                  <div className="booking-details">
                                    <div className="row">
                                      <div className="col-md-8">
                                        <h6>Description:</h6>
                                        <p className="text-muted">{booking.description}</p>
                                        <div className="client-info">
                                          <h6>Client Information:</h6>
                                          <p className="mb-1"><strong>Name:</strong> {booking.user.name}</p>
                                          <p className="mb-1"><strong>Email:</strong> {booking.user.email}</p>
                                          <p className="mb-0"><strong>Phone:</strong> {booking.user.phone}</p>
                                        </div>
                                      </div>
                                      <div className="col-md-4">
                                        <h6>Actions:</h6>
                                        <div className="d-grid gap-2">
                                          {booking.status === 'pending' && (
                                            <>
                                              <button 
                                                className="btn btn-success btn-sm"
                                                onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                                              >
                                                <i className="bi bi-check-circle me-1"></i>Confirm
                                              </button>
                                              <button 
                                                className="btn btn-danger btn-sm"
                                                onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                                              >
                                                <i className="bi bi-x-circle me-1"></i>Cancel
                                              </button>
                                            </>
                                          )}
                                          {booking.status === 'confirmed' && (
                                            <button 
                                              className="btn btn-primary btn-sm"
                                              onClick={() => updateBookingStatus(booking._id, 'completed')}
                                            >
                                              <i className="bi bi-check2-all me-1"></i>Mark Complete
                                            </button>
                                          )}
                                          {booking.status === 'completed' && (
                                            <span className="text-success">
                                              <i className="bi bi-check-circle-fill me-1"></i>Service Completed
                                            </span>
                                          )}
                                          {booking.status === 'cancelled' && (
                                            <span className="text-danger">
                                              <i className="bi bi-x-circle-fill me-1"></i>Booking Cancelled
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <i className="bi bi-calendar-x display-4 text-muted"></i>
                            <h5 className="mt-3 text-muted">No Bookings Yet</h5>
                            <p className="text-muted">You haven't received any service bookings yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard; 