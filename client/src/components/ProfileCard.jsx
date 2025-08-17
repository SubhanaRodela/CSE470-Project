import React, { useState, useEffect } from 'react';
import '../styles/ProfileCard.css';

const ProfileCard = ({ provider, isOpen, onClose, onShowOnMap, onOpenReviews, onSendMessage }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && provider) {
      loadProviderReviews(provider._id || provider.id || provider.userId);
    }
  }, [isOpen, provider]);

  const loadProviderReviews = async (providerId) => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
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

  if (!provider) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="profile-card-backdrop" onClick={onClose} />
      )}
      
      {/* Profile Card */}
      <div className={`profile-card ${isOpen ? 'slide-in' : ''}`}>
        {/* Header */}
        <div className="profile-card-header">
          <div className="profile-card-avatar">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-card-info">
            <h2 className="profile-card-name">{provider.name}</h2>
            <p className="profile-card-occupation">{provider.occupation}</p>
            {totalReviews > 0 && (
              <div className="profile-card-rating">
                {renderStars(averageRating)}
                <span className="rating-text">
                  {averageRating.toFixed(1)} ({totalReviews} reviews)
                </span>
              </div>
            )}
          </div>
          <button className="profile-card-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="profile-card-content">
          {/* Contact Information */}
          <div className="profile-card-section">
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
            <div className="profile-card-section">
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
            <div className="profile-card-section">
              <h4><i className="bi bi-info-circle"></i> About</h4>
              <p className="about-text">{provider.about}</p>
            </div>
          )}

          {/* Recent Reviews */}
          {isLoading ? (
            <div className="profile-card-section">
              <h4><i className="bi bi-chat-dots"></i> Recent Reviews</h4>
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 mb-0 text-muted">Loading reviews...</p>
              </div>
            </div>
          ) : reviews.length > 0 ? (
            <div className="profile-card-section">
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
                  <button className="btn btn-link p-0" onClick={onOpenReviews}>
                    View all {reviews.length} reviews
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="profile-card-section">
              <h4><i className="bi bi-chat-dots"></i> Reviews</h4>
              <p className="text-muted">No reviews yet. Be the first to review this provider!</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="profile-card-actions">
          <button className="btn btn-primary" onClick={onSendMessage}>
            <i className="bi bi-envelope"></i> Send Message
          </button>
          <button className="btn btn-outline-primary" onClick={onShowOnMap}>
            <i className="bi bi-geo-alt"></i> Show on Map
          </button>
          <button className="btn btn-outline-info" onClick={onOpenReviews}>
            <i className="bi bi-chat-dots"></i> View Reviews
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileCard;
