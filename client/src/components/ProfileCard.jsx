import React, { useState, useEffect } from 'react';
import '../styles/ProfileCard.css';

const ProfileCard = ({ provider, isOpen, onClose, onShowOnMap, onOpenReviews, onSendMessage, onBookNow, onShowRoute }) => {
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Debug logging to see what data is received
  console.log('ProfileCard received provider data:', provider);

  // Set default values for rating display
  useEffect(() => {
    if (isOpen && provider) {
      // Set default values - these will be populated by the parent component if needed
      setAverageRating(provider.averageRating || 0);
      setTotalReviews(provider.totalReviews || 0);
      
      // Debug logging
      console.log('ProfileCard rating data:', {
        averageRating: provider.averageRating,
        totalReviews: provider.totalReviews
      });
    }
  }, [isOpen, provider]);



  if (!provider) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="profile-modal-backdrop" onClick={onClose} />
      )}
      
      {/* Profile Modal */}
      <div className={`profile-modal ${isOpen ? 'modal-open' : ''}`}>
        {/* Header */}
        <div className="profile-modal-header">
          <div className="profile-modal-avatar">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-modal-info">
            <h2 className="profile-modal-name">{provider.name}</h2>
            <p className="profile-modal-occupation">{provider.occupation}</p>
            <div className="profile-modal-rating">
              {totalReviews > 0 && averageRating !== 'N/A' ? (
                <span className="rating-text">
                  <i className="bi bi-star-fill text-warning me-1"></i>
                  {typeof averageRating === 'number' ? averageRating.toFixed(1) : averageRating} ({totalReviews} reviews)
                </span>
              ) : (
                <span className="rating-text text-muted">
                  <i className="bi bi-star text-muted me-1"></i>
                  No reviews yet
                </span>
              )}
            </div>
          </div>
          <button className="profile-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="profile-modal-content">
          {/* Contact Information */}
          <div className="profile-modal-section">
            <h4><i className="bi bi-telephone"></i> Contact Information</h4>
            <div className="contact-info">
              <p><strong>Phone:</strong> {provider.phone}</p>
              <p><strong>Email:</strong> {provider.email}</p>
              {provider.address && (
                <p><strong>Address:</strong> {provider.address}</p>
              )}
            </div>
          </div>

          {/* Pricing Information */}
          {provider.charge && (
            <div className="profile-modal-section">
              <h4><i className="bi bi-currency-dollar"></i> Pricing (Taka)</h4>
              <div className="pricing-info">
                <p className="charge-amount">
                  <strong>Service Charge:</strong> ৳{provider.charge}
                </p>
                <small className="charge-note">Base rate per service</small>
              </div>
            </div>
          )}

          {/* Services */}
          {provider.services && provider.services.length > 0 && (
            <div className="profile-modal-section">
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
            <div className="profile-modal-section">
              <h4><i className="bi bi-info-circle"></i> About</h4>
              <p className="about-text">{provider.about}</p>
            </div>
          )}


        </div>

        {/* Action Buttons */}
        <div className="profile-modal-actions">
          <button className="btn btn-outline-primary" onClick={onShowOnMap}>
            <i className="bi bi-geo-alt"></i> Show on Map
          </button>
          <button className="btn btn-outline-info" onClick={onOpenReviews}>
            <i className="bi bi-chat-dots"></i> View Reviews
          </button>
          <button className="btn btn-outline-success" onClick={onSendMessage}>
            <i className="bi bi-envelope"></i> Send Message
          </button>
          <button className="btn btn-primary" onClick={onBookNow}>
            <i className="bi bi-calendar-check"></i> Book Now
          </button>
          <button className="btn btn-outline-warning" onClick={onShowRoute}>
            <i className="bi bi-signpost-2"></i> Show Route
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileCard;
