import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/TransactionHistory.css';

const TransactionHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    setUser(userInfo);
    loadTransactions();
  }, [navigate, currentPage]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `http://localhost:5000/api/transactions/history?page=${currentPage}&limit=10`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Transaction data received:', data.data.transactions);
        setTransactions(data.data.transactions);
        setTotalPages(data.data.pagination.totalPages);
        setTotalTransactions(data.data.pagination.totalTransactions);
      } else {
        setError(data.message || 'Failed to load transactions');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { class: 'success', icon: 'bi-check-circle-fill' },
      'pending': { class: 'warning', icon: 'bi-clock' },
      'failed': { class: 'danger', icon: 'bi-x-circle-fill' },
      'cancelled': { class: 'secondary', icon: 'bi-x-circle' }
    };

    const config = statusConfig[status] || { class: 'secondary', icon: 'bi-question-circle' };
    
    return (
      <span className={`badge bg-${config.class}`}>
        <i className={`${config.icon} me-1`}></i>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    return type === 'sent' ? 'bi-arrow-up-circle text-danger' : 'bi-arrow-down-circle text-success';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const downloadReceipt = async (transactionId) => {
    try {
      console.log('Downloading receipt for transactionId:', transactionId);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionId}/receipt`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Create blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `receipt-${transactionId}.pdf`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error('Receipt download failed:', errorData);
        alert(errorData.message || 'Failed to download receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  const filteredTransactions = transactions;

  return (
    <div className="transaction-history-container">
      <Navbar />
      <div className="container-fluid">
        <div className="row mt-5">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-6 mb-0">Transaction History</h1>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/user-dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>





            {/* Transactions List */}
            <div className="transactions-section">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading transactions...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger text-center">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              ) : filteredTransactions.length > 0 ? (
                <>
                  <div className="transactions-list">
                    {filteredTransactions.map((transaction) => (
                      <div key={transaction.id} className="transaction-item">
                        <div className="transaction-header">
                          <div className="transaction-type">
                            <i className={`bi ${getTypeIcon(transaction.type)} fs-4`}></i>
                            <span className="ms-2 fw-bold">
                              {transaction.type === 'sent' ? 'Sent' : 'Received'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="transaction-details">
                          <div className="row">
                            <div className="col-md-8">
                              <h6 className="transaction-description">{transaction.description}</h6>
                              <p className="text-muted mb-1">
                                <strong>To/From:</strong> {transaction.otherParty.name}
                              </p>
                              {transaction.serviceDetails?.serviceName && (
                                <p className="text-muted mb-1">
                                  <strong>Service:</strong> {transaction.serviceDetails.serviceName}
                                </p>
                              )}
                              <p className="text-muted mb-0">
                                <strong>Date:</strong> {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                                                         <div className="col-md-4 text-end">
                               <div className="transaction-status">
                                 {getStatusBadge(transaction.status)}
                               </div>
                               <div className="transaction-id mt-2">
                                 <small className="text-muted">
                                   ID: {transaction.transactionId}
                                 </small>
                               </div>
                               <div className="transaction-actions mt-2">
                                 <button
                                   className="btn btn-outline-primary btn-sm"
                                   onClick={() => {
                                     console.log('Transaction data for receipt:', {
                                       id: transaction.id,
                                       transactionId: transaction.transactionId,
                                       amount: transaction.amount,
                                       amountType: typeof transaction.amount,
                                       baseAmount: transaction.baseAmount,
                                       discountApplied: transaction.discountApplied,
                                       notes: transaction.notes,
                                       type: transaction.type,
                                       status: transaction.status
                                     });
                                     downloadReceipt(transaction.transactionId);
                                   }}
                                   title="Download Receipt"
                                 >
                                   <i className="bi bi-download me-1"></i>
                                   Receipt
                                 </button>
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination-section mt-4">
                      <nav aria-label="Transaction pagination">
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(page)}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-receipt display-4 text-muted"></i>
                  <h5 className="mt-3 text-muted">No Transactions Found</h5>
                  <p className="text-muted">
                    You haven't made any transactions yet.
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

export default TransactionHistory;
