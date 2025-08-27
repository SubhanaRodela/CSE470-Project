import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/Dashboard.css';
import '../styles/BookingModal.css';

const Orders = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
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

      const response = await fetch('http://localhost:5000/api/bookings/service-provider', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('Load bookings response:', data);
      
      if (data.success) {
        console.log('Bookings loaded:', data.bookings);
        console.log('First booking user field:', data.bookings[0]?.user);
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
      console.log('Update booking status response:', data);
      
      if (data.success) {
        // If the response includes the updated booking with populated data, use it
        if (data.booking) {
          console.log('Using populated booking data:', data.booking);
          setBookings(prev => prev.map(booking => 
            booking._id === bookingId ? data.booking : booking
          ));
        } else {
          // Otherwise, just update the status
          console.log('No populated data, updating status only');
          setBookings(prev => prev.map(booking => 
            booking._id === bookingId ? { ...booking, status: newStatus } : booking
          ));
        }
      } else {
        console.error('Failed to update booking status:', data.message);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleRequestMoney = async (bookingId, amount, title) => {
    try {
      console.log('Frontend - Requesting money:', { bookingId, amount, title, amountType: typeof amount });
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const requestBody = {
        bookingId,
        amount,
        description: `Payment request for ${title}`
      };
      
      console.log('Frontend - Request body:', requestBody);

      const response = await fetch('http://localhost:5000/api/money-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Frontend - Response:', data);
      
      if (data.success) {
        // Update the booking status to 'request' in the local state
        setBookings(prev => prev.map(booking => 
          booking._id === bookingId ? { ...booking, status: 'request' } : booking
        ));
        
        // Show success message
        alert('Money request sent successfully!');
      } else {
        console.error('Failed to create money request:', data.message);
        alert(`Failed to create money request: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating money request:', error);
      alert('Error creating money request. Please try again.');
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
      case 'new':
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
    return bookings.filter(booking => booking.status === status).length;
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const filteredBookings = getFilteredBookings();
  
  // Debug: Log the first booking to see its structure
  if (filteredBookings.length > 0) {
    console.log('First booking data:', filteredBookings[0]);
    console.log('User field:', filteredBookings[0].user);
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="container-fluid">
        <div className="row mt-5">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-6 mb-0">Orders Management</h1>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/service-provider-dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>

            {/* Tabs */}
            <div className="orders-tabs mb-4">
              <div className="nav nav-tabs" id="ordersTab" role="tablist">
                <button
                  className={`nav-link ${activeTab === 'new' ? 'active' : ''}`}
                  onClick={() => setActiveTab('new')}
                  type="button"
                >
                  New Orders
                  <span className="badge bg-warning ms-2">{getTabCount('pending')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'confirmed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('confirmed')}
                  type="button"
                >
                  Confirmed Orders
                  <span className="badge bg-info ms-2">{getTabCount('confirmed')}</span>
                </button>
                <button
                  className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('completed')}
                  type="button"
                >
                  Completed Orders
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
                  Cancelled Orders
                  <span className="badge bg-danger ms-2">{getTabCount('cancelled')}</span>
                </button>
              </div>
            </div>

            {/* Orders Content */}
            <div className="orders-content">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading orders...</p>
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
                            <strong>Client:</strong> {booking.user?.name || 'Unknown'}
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
                              <strong>Charge:</strong> {booking.charge}
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
                              <div className="client-info">
                                <h6>Client Information:</h6>
                                <p className="mb-1"><strong>Name:</strong> {booking.user?.name || 'Unknown'}</p>
                                <p className="mb-1"><strong>Email:</strong> {booking.user?.email || 'N/A'}</p>
                                <p className="mb-0"><strong>Phone:</strong> {booking.user?.phone || 'N/A'}</p>
                              </div>
                              
                              {booking.userAddress && (
                                <div className="client-address mt-3">
                                  <h6>Service Address:</h6>
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
                                  <button 
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleRequestMoney(booking._id, booking.charge, booking.title)}
                                  >
                                    <i className="bi bi-cash-coin me-1"></i>Request Money
                                  </button>
                                )}
                                {booking.status === 'request' && (
                                  <span className="text-primary">
                                    <i className="bi bi-cash-coin me-1"></i>Payment Requested
                                  </span>
                                )}
                                {booking.status === 'cancelled' && (
                                  <span className="text-danger">
                                    <i className="bi bi-x-circle-fill me-1"></i>Order Cancelled
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
                  <h5 className="mt-3 text-muted">No {activeTab === 'new' ? 'New' : activeTab === 'confirmed' ? 'Confirmed' : activeTab === 'completed' ? 'Completed' : activeTab === 'request' ? 'Request' : 'Cancelled'} Orders</h5>
                  <p className="text-muted">
                    {activeTab === 'new' 
                      ? "You don't have any pending orders at the moment."
                      : activeTab === 'confirmed'
                      ? "No confirmed orders to display."
                      : activeTab === 'completed'
                      ? "No completed orders to display."
                      : activeTab === 'request'
                      ? "No request orders to display."
                      : "No cancelled orders to display."
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

export default Orders;
