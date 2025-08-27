import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageNotification from '../components/MessageNotification';
import '../styles/Dashboard.css';
import '../styles/ServiceProviderDashboard.css';
import Navbar from './navbar';

const ServiceProviderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    todayBookings: 0,
    weeklyBookings: [],
    monthlyBookings: [],
    recentBookings: [],
    pendingMoneyRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const userId = user?.id || user?._id;

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Fetch all bookings for this service provider
      const bookingsResponse = await fetch(`http://localhost:5000/api/bookings/service-provider`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!bookingsResponse.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const bookingsData = await bookingsResponse.json();
      const bookings = bookingsData.bookings || [];

      // Calculate dashboard metrics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Load provider QPay balance to show as earnings
      let totalEarnings = 0;
      try {
        const qpayRes = await fetch('http://localhost:5000/api/qpay/account', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (qpayRes.ok) {
          const qpayData = await qpayRes.json();
          totalEarnings = Number(qpayData?.data?.balance) || 0;
        }
      } catch (_) {}

      const monthlyEarnings = bookings
        .filter(booking => 
          booking.status === 'completed' && 
          new Date(booking.createdAt) >= monthAgo
        )
        .reduce((sum, booking) => sum + (parseFloat(booking.charge) || 0), 0);

      const weeklyEarnings = bookings
        .filter(booking => 
          booking.status === 'completed' && 
          new Date(booking.createdAt) >= weekAgo
        )
        .reduce((sum, booking) => sum + (parseFloat(booking.charge) || 0), 0);

      // Calculate booking counts
      const totalBookings = bookings.length;
      const pendingBookings = bookings.filter(booking => booking.status === 'pending').length;
      const completedBookings = bookings.filter(booking => booking.status === 'completed').length;
      const cancelledBookings = bookings.filter(booking => booking.status === 'cancelled').length;
      
      const todayBookings = bookings.filter(booking => 
        new Date(booking.createdAt) >= today
      ).length;

      // Generate weekly data for the last 7 days
      const weeklyBookings = [];
      const weeklyEarningsByDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayBookingsList = bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate.getDate() === date.getDate() && 
                 bookingDate.getMonth() === date.getMonth() && 
                 bookingDate.getFullYear() === date.getFullYear();
        });
        weeklyBookings.push(dayBookingsList.length);
        const dayEarnings = dayBookingsList
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (parseFloat(b.charge) || 0), 0);
        weeklyEarningsByDay.push(dayEarnings);
      }

      // Generate monthly data for the last 12 months
      const monthlyBookings = [];
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= month && bookingDate <= monthEnd;
        }).length;
        monthlyBookings.push(monthBookings);
      }

      // Get recent bookings (last 4)
      const recentBookings = bookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4)
        .map(booking => ({
          id: booking._id,
          customerName: booking.user?.name || 'Unknown Customer',
          service: booking.title || 'Service',
          amount: parseFloat(booking.charge) || 0,
          status: booking.status,
          date: booking.createdAt
        }));

      // Calculate trends
      const previousWeekEarnings = bookings
        .filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          const prevWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
          return booking.status === 'completed' && 
                 bookingDate >= prevWeekStart && 
                 bookingDate < weekAgo;
        })
        .reduce((sum, booking) => sum + (parseFloat(booking.charge) || 0), 0);

      const previousMonthEarnings = bookings
        .filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          const prevMonthStart = new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
          return booking.status === 'completed' && 
                 bookingDate >= prevMonthStart && 
                 bookingDate < monthAgo;
        })
        .reduce((sum, booking) => sum + (parseFloat(booking.charge) || 0), 0);

      const weeklyTrend = previousWeekEarnings > 0 
        ? ((weeklyEarnings - previousWeekEarnings) / previousWeekEarnings * 100).toFixed(1)
        : 0;

      const monthlyTrend = previousMonthEarnings > 0 
        ? ((monthlyEarnings - previousMonthEarnings) / previousMonthEarnings * 100).toFixed(1)
        : 0;

      // Load pending money requests count
      const moneyRequestsResponse = await fetch(`http://localhost:5000/api/money-requests/service-provider`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let pendingMoneyRequests = 0;
      if (moneyRequestsResponse.ok) {
        const moneyRequestsData = await moneyRequestsResponse.json();
        pendingMoneyRequests = moneyRequestsData.data.filter(req => req.status === 'pending').length;
      }

      setDashboardData({
        totalEarnings,
        monthlyEarnings,
        weeklyEarnings,
        totalBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        todayBookings,
        weeklyBookings,
        monthlyBookings,
        weeklyEarningsByDay,
        recentBookings,
        weeklyTrend: parseFloat(weeklyTrend),
        monthlyTrend: parseFloat(monthlyTrend),
        pendingMoneyRequests
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-warning';
      case 'completed': return 'text-success';
      case 'cancelled': return 'text-danger';
      default: return 'text-secondary';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'bg-warning';
      case 'completed': return 'bg-success';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="container-fluid">
          <div className="text-center mt-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="container-fluid">
          <div className="alert alert-danger mt-5" role="alert">
            <h4 className="alert-heading">Error Loading Dashboard</h4>
            <p>{error}</p>
            <hr />
            <button className="btn btn-outline-danger" onClick={loadDashboardData}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      
      <div className="container-fluid">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h2 className="welcome-title">
              <i className="bi bi-person-circle me-3"></i>
              Welcome back, {user.name}!
            </h2>
            <p className="welcome-subtitle">Here's what's happening with your services today</p>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="row stats-cards-row">
          <div className="col-lg-3 col-md-6 mb-4">
            <div className="stat-card earnings-card">
              <div className="stat-card-icon">
                <i className="bi bi-cash-stack"></i>
              </div>
              <div className="stat-card-content">
                <h3 className="stat-card-value">৳{dashboardData.totalEarnings.toLocaleString()}</h3>
                <p className="stat-card-label">Total Earnings</p>
                <div className={`stat-card-trend ${dashboardData.monthlyTrend >= 0 ? 'positive' : 'negative'}`}>
                  <i className={`bi bi-arrow-${dashboardData.monthlyTrend >= 0 ? 'up' : 'down'}`}></i>
                  <span>{Math.abs(dashboardData.monthlyTrend)}% this month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <div className="stat-card bookings-card">
              <div className="stat-card-icon">
                <i className="bi bi-calendar-check"></i>
              </div>
              <div className="stat-card-content">
                <h3 className="stat-card-value">{dashboardData.totalBookings}</h3>
                <p className="stat-card-label">Total Bookings</p>
                <div className={`stat-card-trend ${dashboardData.weeklyTrend >= 0 ? 'positive' : 'negative'}`}>
                  <i className={`bi bi-arrow-${dashboardData.weeklyTrend >= 0 ? 'up' : 'down'}`}></i>
                  <span>{Math.abs(dashboardData.weeklyTrend)}% this week</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <div className="stat-card pending-card">
              <div className="stat-card-icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <div className="stat-card-content">
                <h3 className="stat-card-value">{dashboardData.pendingBookings}</h3>
                <p className="stat-card-label">Pending Bookings</p>
                <div className="stat-card-trend neutral">
                  <i className="bi bi-dash"></i>
                  <span>Requires attention</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <div className="stat-card today-card">
              <div className="stat-card-icon">
                <i className="bi bi-calendar-day"></i>
              </div>
              <div className="stat-card-content">
                <h3 className="stat-card-value">{dashboardData.todayBookings}</h3>
                <p className="stat-card-label">Today's Bookings</p>
                <div className="stat-card-trend positive">
                  <i className="bi bi-arrow-up"></i>
                  <span>New today</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending payments card removed as requested */}
        </div>

        {/* Charts and Analytics Row */}
        <div className="row charts-row">
          <div className="col-lg-8 mb-4">
            <div className="chart-card">
              <div className="chart-card-header">
                <h5 className="chart-card-title">
                  <i className="bi bi-graph-up me-2"></i>
                  Weekly Bookings & Earnings
                </h5>
              </div>
              <div className="chart-card-body">
                <div className="chart-container">
                  <div className="chart-placeholder">
                    {(() => {
                      const bookings = dashboardData.weeklyBookings || [];
                      const earnings = dashboardData.weeklyEarningsByDay || [];
                      const points = Math.max(bookings.length, earnings.length);
                      const width = 560; // container width
                      const height = 160; // container height
                      const padding = 20;
                      const maxBookings = Math.max(...bookings, 1);
                      const maxEarnings = Math.max(...earnings, 1);
                      const stepX = points > 1 ? (width - padding * 2) / (points - 1) : 0;

                      const mapLine = (arr, maxVal) => {
                        return arr.map((val, idx) => {
                          const x = padding + idx * stepX;
                          const y = padding + (height - padding * 2) * (1 - (val / (maxVal || 1)));
                          return `${x},${y}`;
                        }).join(' ');
                      };

                      const bookingsLine = mapLine(bookings, maxBookings);
                      const earningsLine = mapLine(earnings, maxEarnings);

                      return (
                        <div className="mb-3">
                          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
                               preserveAspectRatio="none" style={{ display: 'block' }}>
                            {/* grid lines */}
                            <g stroke="#eef2ff">
                              {[0,1,2,3].map(i => (
                                <line key={i} x1={padding} x2={width - padding}
                                      y1={padding + ((height - padding * 2) / 3) * i}
                                      y2={padding + ((height - padding * 2) / 3) * i} />
                              ))}
                            </g>
                            {/* earnings area (green) */}
                            <polyline points={earningsLine} fill="none" stroke="#10b981" strokeWidth="2" />
                            {/* bookings line (purple) */}
                            <polyline points={bookingsLine} fill="none" stroke="#7c3aed" strokeWidth="2" />
                          </svg>
                          <div className="d-flex justify-content-between">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(0, points).map((d, i) => (
                              <small key={d + i} className="text-muted">{d}</small>
                            ))}
                          </div>
                          <div className="d-flex gap-3 mt-2">
                            <span className="d-inline-flex align-items-center gap-1"><span style={{width:10,height:2,background:'#7c3aed',display:'inline-block'}}></span><small className="text-muted">Bookings</small></span>
                            <span className="d-inline-flex align-items-center gap-1"><span style={{width:10,height:2,background:'#10b981',display:'inline-block'}}></span><small className="text-muted">Earnings</small></span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 mb-4">
            <div className="chart-card">
              <div className="chart-card-header">
                <h5 className="chart-card-title">
                  <i className="bi bi-pie-chart me-2"></i>
                  Booking Status
                </h5>
              </div>
              <div className="chart-card-body">
                <div className="status-chart">
                  <div className="status-chart-circle">
                    <div className="status-chart-center">
                      <span className="status-chart-total">{dashboardData.totalBookings}</span>
                      <span className="status-chart-label">Total</span>
                    </div>
                  </div>
                  <div className="status-chart-legend">
                    <div className="status-legend-item">
                      <span className="status-dot completed"></span>
                      <span>Completed ({dashboardData.completedBookings})</span>
                    </div>
                    <div className="status-legend-item">
                      <span className="status-dot pending"></span>
                      <span>Pending ({dashboardData.pendingBookings})</span>
                    </div>
                    <div className="status-legend-item">
                      <span className="status-dot cancelled"></span>
                      <span>Cancelled ({dashboardData.cancelledBookings})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings and Quick Actions */}
        <div className="row bottom-row">
          {/* Recent bookings section removed as requested */}
          <div className="col-lg-8 mb-4 d-none">
            <div className="chart-card">
              <div className="chart-card-header">
                <h5 className="chart-card-title">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Bookings
                </h5>
                <button className="view-all-btn" onClick={() => navigate('/orders')}>
                  View All
                </button>
              </div>
              <div className="chart-card-body">
                {dashboardData.recentBookings.length > 0 ? (
                  <div className="recent-bookings-list">
                    {dashboardData.recentBookings.map((booking) => (
                      <div key={booking.id} className="recent-booking-item">
                        <div className="booking-info">
                          <div className="booking-customer">
                            <h6 className="customer-name">{booking.customerName}</h6>
                            <span className="booking-service">{booking.service}</span>
                          </div>
                          <div className="booking-amount">
                            <span className="amount">৳{booking.amount}</span>
                            <span className={`status-badge ${getStatusBadge(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                        <div className="booking-date">
                          <i className="bi bi-calendar3"></i>
                          {new Date(booking.date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="text-muted mt-2">No recent bookings</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4 mb-4">
            <div className="chart-card">
              <div className="chart-card-header">
                <h5 className="chart-card-title">
                  <i className="bi bi-lightning me-2"></i>
                  Quick Actions
                </h5>
              </div>
              <div className="chart-card-body">
                <div className="quick-actions">
                  <button className="quick-action-btn primary" onClick={() => navigate('/orders')}>
                    <i className="bi bi-list-ul"></i>
                    <span>View Orders</span>
                  </button>
                  <button className="quick-action-btn secondary" onClick={() => navigate('/transaction-history')}>
                    <i className="bi bi-clock-history"></i>
                    <span>History</span>
                  </button>
                  <button className="quick-action-btn success" onClick={() => navigate('/pay')}>
                    <i className="bi bi-credit-card"></i>
                    <span>QPay</span>
                  </button>
                  <button className="quick-action-btn info" onClick={() => navigate('/chatbox')}>
                    <i className="bi bi-chat-dots"></i>
                    <span>Messages</span>
                  </button>
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