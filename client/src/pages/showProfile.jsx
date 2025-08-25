import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/showProfile.css';
import Navbar from './navbar';

const ShowProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [provider, setProvider] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    // Get provider data from location state or URL params
    const providerData = location.state?.provider;
    const providerId = new URLSearchParams(location.search).get('providerId');
    
         if (providerData) {
       setProvider(providerData);
       setIsLoading(false);
       // Trigger slide-in animation after a short delay
       setTimeout(() => setIsVisible(true), 100);
       loadProviderReviews(providerData._id || providerData.id || providerData.userId);
     } else if (providerId) {
      loadProviderData(providerId);
    } else {
      // No provider data, go back
      navigate(-1);
    }
  }, [location, navigate]);

  const loadProviderData = async (providerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/user/${providerId}`);
      if (response.ok) {
        const data = await response.json();
        setProvider(data.user);
        setIsLoading(false);
        setTimeout(() => setIsVisible(true), 100);
        loadProviderReviews(providerId);
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error loading provider data:', error);
      navigate(-1);
    }
  };

  const loadProviderReviews = async (providerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reviews/service-provider/${providerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReviews(data.reviews || []);
          
          // Calculate average rating
          if (data.reviews && data.reviews.length > 0) {
            const total = data.reviews.reduce((sum, review) => sum + review.rating, 0);
            setAverageRating(total / data.reviews.length);
            setTotalReviews(data.reviews.length);
          }
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(-1);
    }, 300); // Wait for slide-out animation
  };

  const handleChat = () => {
    navigate(`/chatbox?providerId=${provider._id || provider.id || provider.userId}`);
  };

  const handleShowOnMap = () => {
    // Navigate back to dashboard with provider selected
    navigate('/user-dashboard', { 
      state: { 
        selectedProvider: provider,
        showOnMap: true 
      } 
    });
  };

  const handleViewReviews = () => {
    // Navigate back to dashboard and open review modal
    navigate('/user-dashboard', { 
      state: { 
        selectedProvider: provider,
        openReviewModal: true 
      } 
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="bi bi-star-fill text-warning"></i>);
    }
    
    if (hasHalfStar) {
      stars.push(<i key="half" className="bi bi-star-half text-warning"></i>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="bi bi-star text-muted"></i>);
    }
    
    return stars;
  };

  if (isLoading) {
    return (
      <div className="show-profile-overlay">
        <div className="show-profile-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return null;
  }

  return (
    <div className="show-profile-overlay" onClick={handleClose}>
      <Navbar />
      <div 
        className={`show-profile-card ${isVisible ? 'slide-in' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{provider.name}</h2>
            <p className="profile-occupation">{provider.occupation}</p>
            {totalReviews > 0 && (
              <div className="profile-rating">
                {renderStars(averageRating)}
                <span className="rating-text">
                  {averageRating.toFixed(1)} ({totalReviews} reviews)
                </span>
              </div>
            )}
          </div>
          <button className="close-btn" onClick={handleClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="profile-content">
          {/* Contact Information */}
          <div className="profile-section">
            <h4><i className="bi bi-telephone"></i> Contact Information</h4>
            <div className="contact-info">
              <p><strong>Phone:</strong> {provider.phone}</p>
              <p><strong>Email:</strong> {provider.email}</p>
              {provider.address && (
                <p><strong>Address:</strong> {provider.address}</p>
              )}
            </div>
          </div>

          {/* Services */}
          {provider.services && provider.services.length > 0 && (
            <div className="profile-section">
              <h4><i className="bi bi-tools"></i> Services Offered</h4>
              <div className="services-list">
                {provider.services.map((service, index) => (
                  <span key={index} className="service-tag">{service}</span>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {provider.about && (
            <div className="profile-section">
              <h4><i className="bi bi-info-circle"></i> About</h4>
              <p className="about-text">{provider.about}</p>
            </div>
          )}

          {/* Recent Reviews */}
          {reviews.length > 0 && (
            <div className="profile-section">
              <h4><i className="bi bi-chat-dots"></i> Recent Reviews</h4>
              <div className="reviews-preview">
                {reviews.slice(0, 3).map((review, index) => (
                  <div key={index} className="review-item">
                    <div className="review-header">
                      <div className="review-stars">
                        {renderStars(review.rating)}
                      </div>
                      <small className="review-date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <p className="review-comment">{review.comment}</p>
                  </div>
                ))}
                {reviews.length > 3 && (
                  <button className="btn btn-link p-0" onClick={handleViewReviews}>
                    View all {reviews.length} reviews
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button className="btn btn-primary" onClick={handleChat}>
            <i className="bi bi-envelope"></i> Send Message
          </button>
          <button className="btn btn-outline-primary" onClick={handleShowOnMap}>
            <i className="bi bi-geo-alt"></i> Show on Map
          </button>
          <button className="btn btn-outline-info" onClick={handleViewReviews}>
            <i className="bi bi-chat-dots"></i> View Reviews
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShowProfile;
