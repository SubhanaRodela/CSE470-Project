import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './navbar';
import '../styles/Pay.css';
import QPayLoginModal from '../components/QPayLoginModal';
import SendMoneyModal from '../components/SendMoneyModal';

const Pay = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);
  
  // Get payment details from URL params
  const bookingId = searchParams.get('bookingId');
  const requestId = searchParams.get('requestId');
  const amount = searchParams.get('amount');
  const providerId = searchParams.get('providerId');
  const providerName = searchParams.get('providerName');
  const serviceName = searchParams.get('serviceName');
  const paymentType = searchParams.get('type');
  
  // Check if this is a payment request (either booking or money request)
  const isPaymentRequest = (bookingId && amount && providerId) || (requestId && amount && providerName && paymentType === 'moneyRequest' && providerId);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    setUser(userInfo);
    setLoading(false);
    
    // Debug: Log all URL parameters
    console.log('Pay page URL parameters:', {
      bookingId,
      requestId,
      amount,
      amountType: typeof amount,
      amountParsed: parseFloat(amount),
      amountStringified: JSON.stringify(amount),
      providerId,
      providerName,
      serviceName,
      paymentType,
      isPaymentRequest
    });
    
    // If this is a payment request, show the send money modal
    if (isPaymentRequest) {
      setShowSendMoneyModal(true);
    }
  }, [navigate, isPaymentRequest, bookingId, requestId, amount, providerId, providerName, serviceName, paymentType]);

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pay-container">
      <Navbar />
      <div className="pay-content">
        <div className="pay-header">
          <h1>QPay Payment System</h1>
          <p>Secure and fast payment processing</p>
        </div>
        
        <div className="pay-cards">
          <div className="pay-card">
            <div className="card-icon">
              <i className="bi bi-person-circle"></i>
            </div>
            <h3>Login</h3>
            <p>Access your existing QPay account</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowLoginModal(true)}
            >
              Login to QPay
            </button>
          </div>
          
          <div className="pay-card">
            <div className="card-icon">
              <i className="bi bi-person-plus"></i>
            </div>
            <h3>Make Account</h3>
            <p>Create a new QPay account</p>
            <button 
              className="btn btn-success"
              onClick={() => navigate('/qpayreg')}
            >
              Create Account
            </button>
          </div>
        </div>
        
        <div className="pay-footer">
          <p>QPay - Your trusted payment partner</p>
        </div>
      </div>
      
             {/* QPay Login Modal */}
       <QPayLoginModal
         isOpen={showLoginModal}
         onClose={() => setShowLoginModal(false)}
         onSuccess={() => {
           setShowLoginModal(false);
           navigate('/qpay');
         }}
       />
       
       {/* Send Money Modal */}
       {isPaymentRequest && (
         <SendMoneyModal
           isOpen={showSendMoneyModal}
           onClose={() => {
             setShowSendMoneyModal(false);
             // Navigate back to user-service without payment completion status
             navigate('/user-service');
           }}
           onSuccess={() => {
             setShowSendMoneyModal(false);
             // Navigate back to user-service with payment completion status
             if (requestId) {
               navigate(`/user-service?requestId=${requestId}&paymentStatus=completed`);
             } else {
               navigate('/user-service');
             }
           }}
           paymentDetails={{
             bookingId,
             requestId,
             amount: parseFloat(amount),
             providerId,
             providerName,
             serviceName,
             paymentType
           }}
         />
       )}
    </div>
  );
};

export default Pay;
