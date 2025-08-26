import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/Dashboard.css';
import '../styles/BookingModal.css';

const UserService = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    if (userInfo.userType !== 'user') {
      navigate('/login');
      return;
    }

    setUser(userInfo);
    loadBookings();
  }, [navigate]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/bookings/user', {
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

  const cancelBooking = async (bookingId) => {
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
        body: JSON.stringify({ status: 'cancelled' })
      });

      const data = await response.json();
      if (data.success) {
        setBookings(prev => prev.map(booking => 
          booking._id === bookingId ? { ...booking, status: 'cancelled' } : booking
        ));
      } else {
        console.error('Failed to cancel booking:', data.message);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'completed': return 'success';
      case 'request': return 'primary';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getFilteredBookings = () => {
    switch (activeTab) {
      case 'all':
        return bookings;
      case 'pending':
        return bookings.filter(booking => booking.status === 'pending');
      case 'confirmed':
        return bookings.filter(booking => booking.status === 'confirmed');
      case 'completed':
        return bookings.filter(booking => booking.status === 'completed');
      case 'request':
        return bookings.filter(booking => booking.status === 'request');
      case 'cancelled':
        return bookings.filter(booking => booking.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const getTabCount = (status) => {
    if (status === 'all') {
      return bookings.length;
    }
    return bookings.filter(booking => booking.status === status).length;
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const filteredBookings = getFilteredBookings();

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="container-fluid">
        <div className="row mt-5">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-6 mb-0">My Service History</h1>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/user-dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>

            {/* Tabs */}
            <div className="orders-tabs mb-4">
              <div className="nav nav-tabs" id="bookingsTab" role="tablist">
                <button
                  className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                  type="button"
                >
                  All Bookings
                  <span className="badge bg-secondary ms-2">{getTabCount('all')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pending')}
                  type="button"
                >
                  Pending
                  <span className="badge bg-warning ms-2">{getTabCount('pending')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'confirmed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('confirmed')}
                  type="button"
                >
                  Confirmed
                  <span className="badge bg-info ms-2">{getTabCount('confirmed')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('completed')}
                  type="button"
                >
                  Completed
                  <span className="badge bg-success ms-2">{getTabCount('completed')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'request' ? 'active' : ''}`}
                  onClick={() => setActiveTab('request')}
                  type="button"
                >
                  Request
                  <span className="badge bg-primary ms-2">{getTabCount('request')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cancelled')}
                  type="button"
                >
                  Cancelled
                  <span className="badge bg-danger ms-2">{getTabCount('cancelled')}</span>
                </button>
              </div>
            </div>

            {/* Bookings Content */}
            <div className="orders-content">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading your service history...</p>
                </div>
              ) : filteredBookings.length > 0 ? (
                <div className="bookings-list">
                  {filteredBookings.map((booking) => (
                    <div key={booking._id} className="booking-item">
                      <div 
                        className="booking-header"
                        onClick={() => toggleBookingExpansion(booking._id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="booking-info">
                          <h6 className="mb-1">{booking.title}</h6>
                          <p className="mb-1 text-muted">
                            <strong>Service Provider:</strong> {booking.serviceProvider?.name || 'Unknown'}
                          </p>
                          <p className="mb-1 text-muted">
                            <strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}
                          </p>
                          {booking.userAddress && (
                            <p className="mb-1 text-muted">
                              <strong>Address:</strong> {booking.userAddress}
                            </p>
                          )}
                          {booking.charge && (
                            <p className="mb-0 text-success">
                              <strong>Charge:</strong> ৳{booking.charge}
                            </p>
                          )}
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
                              <div className="provider-info">
                                <h6>Service Provider Information:</h6>
                                <p className="mb-1"><strong>Name:</strong> {booking.serviceProvider?.name || 'Unknown'}</p>
                                <p className="mb-1"><strong>Occupation:</strong> {booking.serviceProvider?.occupation || 'N/A'}</p>
                                <p className="mb-0"><strong>Services:</strong> {booking.serviceProvider?.services?.join(', ') || 'N/A'}</p>
                              </div>
                              
                              {booking.userAddress && (
                                <div className="user-address mt-3">
                                  <h6>Your Service Address:</h6>
                                  <p className="mb-0 text-muted">
                                    <i className="bi bi-geo-alt me-2"></i>
                                    {booking.userAddress}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="col-md-4">
                              <h6>Actions:</h6>
                              <div className="d-grid gap-2">
                                {booking.status === 'pending' && (
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={() => cancelBooking(booking._id)}
                                  >
                                    <i className="bi bi-x-circle me-1"></i>Cancel Booking
                                  </button>
                                )}
                                {booking.status === 'confirmed' && (
                                  <span className="text-info">
                                    <i className="bi bi-check-circle me-1"></i>Service Confirmed
                                  </span>
                                )}
                                {booking.status === 'completed' && (
                                  <button 
                                    className="btn btn-success btn-sm"
                                    onClick={() => navigate(`/pay?bookingId=${booking._id}&amount=${booking.charge}&providerId=${booking.serviceProvider._id}&providerName=${booking.serviceProvider.name}&serviceName=${booking.title}`)}
                                  >
                                    <i className="bi bi-cash-coin me-1"></i>Send Money
                                  </button>
                                )}
                                {booking.status === 'request' && (
                                  <span className="text-primary">
                                    <i className="bi bi-cash-coin me-1"></i>Payment Requested
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
                  <h5 className="mt-3 text-muted">No {activeTab === 'all' ? '' : activeTab === 'pending' ? 'Pending' : activeTab === 'confirmed' ? 'Confirmed' : activeTab === 'completed' ? 'Completed' : activeTab === 'request' ? 'Request' : 'Cancelled'} Bookings</h5>
                  <p className="text-muted">
                    {activeTab === 'all' 
                      ? "You haven't made any service bookings yet."
                      : `No ${activeTab} bookings to display.`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserService;
