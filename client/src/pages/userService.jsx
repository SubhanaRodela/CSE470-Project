import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/Dashboard.css';
import '../styles/BookingModal.css';

const UserService = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [statusChangeNotification, setStatusChangeNotification] = useState('');
  const [tabLoading, setTabLoading] = useState(false);

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
    loadMoneyRequests();
  }, [navigate]);



  // Effect to handle payment completion and remove paid requests
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('requestId');
    const paymentStatus = urlParams.get('paymentStatus');
    const bookingId = urlParams.get('bookingId');
    
    if (requestId && paymentStatus === 'completed') {
      // Remove the paid request from the list (it's already marked as paid by SendMoneyModal)
      setMoneyRequests(prev => prev.filter(request => request._id !== requestId));
      // Show success message
      setSuccessMessage('Payment completed successfully! The request has been removed from your list.');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      // Clean up the URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    if (bookingId && paymentStatus === 'completed') {
      // Refresh bookings to get updated status
      loadBookings();
      // Show success message
      setSuccessMessage('Payment completed successfully! Your booking status has been updated.');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      // Clean up the URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Effect to refresh money requests when returning from payment
  useEffect(() => {
    // Check if we're returning from payment page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('requestId') || urlParams.has('paymentStatus')) {
      // Refresh money requests to get updated status
      loadMoneyRequests();
    }
  }, []);

  // Effect to refresh money requests when switching to request tab
  useEffect(() => {
    setTabLoading(true);
    if (activeTab === 'request') {
      // Refresh money requests when user switches to request tab
      loadMoneyRequests().finally(() => setTabLoading(false));
    } else {
      // Refresh bookings when switching to other tabs to ensure status is current
      loadBookings().finally(() => setTabLoading(false));
    }
  }, [activeTab]);

  // Effect to refresh bookings when component mounts or when returning from other pages
  useEffect(() => {
    // Refresh bookings when returning to the page
    loadBookings();
  }, []);

  // Effect to poll for booking status updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab !== 'request') {
        loadBookings();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  // Effect to handle page visibility changes (refresh when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab !== 'request') {
        loadBookings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab]);

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
        // Fetch discount information for each service provider
        const bookingsWithDiscounts = await Promise.all(
          data.bookings.map(async (booking) => {
            try {
              const discountResponse = await fetch(
                `http://localhost:5000/api/qpay/provider-discount/${booking.serviceProvider._id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                }
              );
              
              if (discountResponse.ok) {
                const discountData = await discountResponse.json();
                const discount = discountData.data?.discount || 0;
                const discountedAmount = discount > 0 ? 
                  (booking.charge * (1 - discount / 100)).toFixed(2) : 
                  booking.charge;
                
                return {
                  ...booking,
                  providerDiscount: discount,
                  discountedAmount: parseFloat(discountedAmount)
                };
              }
              
              return {
                ...booking,
                providerDiscount: 0,
                discountedAmount: booking.charge
              };
            } catch (error) {
              console.error('Error fetching discount for provider:', error);
              return {
                ...booking,
                providerDiscount: 0,
                discountedAmount: booking.charge
              };
            }
          })
        );
        
        // Check for status changes and show notifications
        checkStatusChanges(bookingsWithDiscounts);
      } else {
        console.error('Failed to load bookings:', data.message);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoneyRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/money-requests/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Only keep pending requests for display in the Request tab
        const pendingOnly = (data.data || []).filter(req => req && req.status === 'pending');
        setMoneyRequests(pendingOnly);
      } else {
        console.error('Failed to load money requests:', data.message);
        setMoneyRequests([]); // Set empty array on error
      }
    } catch (error) {
      console.error('Error loading money requests:', error);
      setMoneyRequests([]); // Set empty array on error
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
        // Update the booking status in the local state
        setBookings(prev => prev.map(booking => 
          booking._id === bookingId ? { ...booking, status: 'cancelled' } : booking
        ));
        
        // Show success message
        setSuccessMessage('Booking cancelled successfully');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        console.error('Failed to cancel booking:', data.message);
        setSuccessMessage('Failed to cancel booking. Please try again.');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setSuccessMessage('Error cancelling booking. Please try again.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handlePayMoneyRequest = async (requestId, amount, providerName, serviceTitle, serviceProviderId) => {
    try {
      // Navigate to pay page with the money request details
      navigate(`/pay?requestId=${requestId}&amount=${amount}&providerName=${encodeURIComponent(providerName)}&serviceTitle=${encodeURIComponent(serviceTitle)}&type=moneyRequest&providerId=${serviceProviderId}`);
    } catch (error) {
      console.error('Error navigating to payment:', error);
      alert('Error navigating to payment page. Please try again.');
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

  // Function to handle booking status changes
  const handleBookingStatusChange = (bookingId, newStatus) => {
    setBookings(prev => prev.map(booking => 
      booking._id === bookingId ? { ...booking, status: newStatus } : booking
    ));
  };

  // Function to check for status changes and show notifications
  const checkStatusChanges = (newBookings) => {
    setBookings(prev => {
      const changes = [];
      
      newBookings.forEach(newBooking => {
        const oldBooking = prev.find(b => b._id === newBooking._id);
        if (oldBooking && oldBooking.status !== newBooking.status) {
          changes.push({
            bookingId: newBooking._id,
            oldStatus: oldBooking.status,
            newStatus: newBooking.status,
            title: newBooking.title
          });
        }
      });

      // Show notifications for status changes
      changes.forEach(change => {
        let message = '';
        switch (change.newStatus) {
          case 'confirmed':
            message = `✅ Your booking "${change.title}" has been confirmed by the service provider!`;
            break;
          case 'completed':
            message = `🎉 Your service "${change.title}" has been completed! You can now make the payment.`;
            break;
          case 'cancelled':
            message = `❌ Your booking "${change.title}" has been cancelled.`;
            break;
          default:
            message = `📝 Your booking "${change.title}" status changed from ${change.oldStatus} to ${change.newStatus}.`;
        }
        
        setStatusChangeNotification(message);
        setTimeout(() => setStatusChangeNotification(''), 8000);
      });

      return newBookings;
    });
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
              <div>
                <h1 className="display-6 mb-0">My Service History</h1>
                {bookings.some(booking => booking.providerDiscount > 0) && (
                  <p className="text-success mb-0 mt-2">
                    <i className="bi bi-piggy-bank me-1"></i>
                    Total Savings: ৳{bookings.reduce((total, booking) => {
                      if (booking.providerDiscount > 0) {
                        return total + (booking.charge * (booking.providerDiscount / 100));
                      }
                      return total;
                    }, 0).toFixed(2)}
                  </p>
                )}
              </div>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/user-dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>

            {/* Success/Error Message */}
            {successMessage && (
              <div className={`alert ${successMessage.includes('successfully') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`} role="alert">
                <i className={`bi ${successMessage.includes('successfully') ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                {successMessage}
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSuccessMessage('')}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* Discount Summary */}
            {bookings.some(booking => booking.providerDiscount > 0) && (
              <div className="alert alert-info mb-4">
                <div className="d-flex align-items-center">
                  <i className="bi bi-piggy-bank fs-4 me-3"></i>
                  <div>
                    <h6 className="mb-1">💰 Total Savings from Provider Discounts</h6>
                    <p className="mb-0">
                      You've saved <strong>৳{bookings.reduce((total, booking) => {
                        if (booking.providerDiscount > 0) {
                          return total + (booking.charge * (booking.providerDiscount / 100));
                        }
                        return total;
                      }, 0).toFixed(2)}</strong> across all your bookings!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Change Notification */}
            {statusChangeNotification && (
              <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
                <i className="bi bi-bell me-2"></i>
                {statusChangeNotification}
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setStatusChangeNotification('')}
                  aria-label="Close"
                ></button>
              </div>
            )}

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
                  <span className="badge bg-primary ms-2">{moneyRequests.length}</span>
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
               {activeTab === 'request' ? (
                // Show money requests for the Request tab
                                 <div className="money-requests-list">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading payment requests...</p>
                    </div>
                  ) : moneyRequests.length > 0 ? (
                    moneyRequests.map((request) => (
                      <div key={request._id} className="money-request-item">
                        <div className="request-header">
                          <div className="request-info">
                            <h6 className="mb-1">{request.booking?.title || 'Unknown Service'}</h6>
                            <p className="mb-1 text-muted">
                              <strong>Service Provider:</strong> {request.serviceProvider?.name || 'Unknown'}
                            </p>
                            <p className="mb-1 text-muted">
                              <strong>Service Date:</strong> {request.booking?.bookingDate ? new Date(request.booking.bookingDate).toLocaleDateString() : 'N/A'}
                            </p>
                            <p className="mb-0 text-success">
                              <strong>Amount Due:</strong> ৳{request.amount || 0}
                            </p>
                          </div>
                          <div className="request-actions">
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handlePayMoneyRequest(request._id, request.amount, request.serviceProvider?.name || 'Unknown', request.booking?.title || 'Unknown Service', request.serviceProvider?._id)}
                            >
                              <i className="bi bi-cash-coin me-1"></i>Pay Now
                            </button>
                          </div>
                        </div>
                        {request.description && (
                          <div className="request-description mt-2">
                            <small className="text-muted">{request.description}</small>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-cash-coin display-4 text-muted"></i>
                      <h5 className="mt-3 text-muted">No Payment Requests</h5>
                      <p className="text-muted">You don't have any pending payment requests at the moment.</p>
                    </div>
                  )}
                </div>
                             ) : (loading || tabLoading) ? (
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
                            <div className="mb-0">
                              {booking.providerDiscount > 0 ? (
                                <div>
                                  <p className="mb-1 text-muted">
                                    <strong>Original Price:</strong> 
                                    <span className="text-decoration-line-through ms-1">৳{booking.charge}</span>
                                  </p>
                                  <p className="mb-1 text-success">
                                    <strong>Final Price:</strong> ৳{booking.discountedAmount}
                                  </p>
                                  <p className="mb-0 text-info">
                                    <strong>Discount:</strong> {booking.providerDiscount}% off
                                  </p>
                                </div>
                              ) : (
                                <p className="mb-0 text-success">
                                  <strong>Charge:</strong> ৳{booking.charge}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="booking-status">
                          <span className={`badge bg-${getStatusColor(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                          {booking.status === 'pending' && (
                            <span className="badge bg-warning ms-1" title="Waiting for provider confirmation">
                              <i className="bi bi-clock"></i>
                            </span>
                          )}
                          {booking.status === 'confirmed' && (
                            <span className="badge bg-info ms-1" title="Provider confirmed your booking">
                              <i className="bi bi-check-circle"></i>
                            </span>
                          )}
                          {booking.status === 'completed' && (
                            <span className="badge bg-success ms-1" title="Service completed, ready for payment">
                              <i className="bi bi-currency-dollar"></i>
                            </span>
                          )}
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
                                    onClick={() => {
                                      // Navigate to payment page
                                      navigate(`/pay?bookingId=${booking._id}&amount=${booking.discountedAmount || booking.charge}&providerId=${booking.serviceProvider._id}&providerName=${booking.serviceProvider.name}&serviceName=${booking.title}`);
                                    }}
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
