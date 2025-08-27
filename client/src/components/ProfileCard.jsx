import React, { useState, useEffect } from 'react';
import '../styles/ProfileCard.css';

const ProfileCard = ({ provider, isOpen, onClose, onOpenReviews, onSendMessage, onBookNow, onShowRoute, onAddFavorite, isFavorite }) => {
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [email, setEmail] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loadingDiscount, setLoadingDiscount] = useState(false);

  useEffect(() => {
    if (isOpen && provider) {
      setAverageRating(provider.averageRating || 0);
      setTotalReviews(provider.totalReviews || 0);
      setEmail(provider.email || '');
      loadDiscount();
    }
  }, [isOpen, provider]);

  useEffect(() => {
    const loadEmail = async () => {
      if (!isOpen || !provider || provider.email) return;
      try {
        const res = await fetch(`http://localhost:5000/api/auth/user/${provider.id}`);
        const data = await res.json();
        if (data && data.success && data.user && data.user.email) {
          setEmail(data.user.email);
        }
      } catch (_) {}
    };
    loadEmail();
  }, [isOpen, provider]);

  const loadDiscount = async () => {
    if (!provider || !provider.id) return;
    
    setLoadingDiscount(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch provider-specific discount
      const res = await fetch(`http://localhost:5000/api/qpay/provider-discount/${provider.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setDiscount(Number(data.data.discount) || 0);
        }
      }
    } catch (error) {
      console.error('Error loading discount:', error);
    } finally {
      setLoadingDiscount(false);
    }
  };

  if (!provider) return null;

  const initial = (provider.name || '').trim().charAt(0).toUpperCase();
  const ratingDisplay = typeof averageRating === 'number' ? averageRating.toFixed(1) : averageRating;

  // Calculate discounted price
  const basePrice = provider.charge || 0;
  const discountAmount = (basePrice * discount) / 100;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return (
    <>
      {isOpen && (
        <div className="profile-modal-backdrop" onClick={onClose} />
      )}
      <div className={`profile-modal ${isOpen ? 'modal-open' : ''}`}>
        <div className="profile-modal-header">
          <div className="profile-avatar-initial">{initial || 'P'}</div>
          <div className="profile-header-main">
            <div className="profile-header-row">
              <div className="profile-name-block">
                <div className="profile-name-row">
                  <div className="profile-name-large">{provider.name}</div>
                </div>
                <div className="profile-occupation-small">{provider.occupation}</div>
              </div>
              <div className="profile-rating-block">
                <div className="profile-rating-top">
                  <button
                    className={`profile-fav-btn ${isFavorite ? 'active' : ''}`}
                    onClick={onAddFavorite}
                    title={isFavorite ? 'Remove from Favourite' : 'Add to Favourite'}
                    type="button"
                  >
                    <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                  </button>
                  <div className="profile-rating-large">
                    <i className="bi bi-star-fill"></i> {ratingDisplay || 'N/A'}
                  </div>
                </div>
                <div className="profile-reviews-small">
                  {totalReviews > 0 && ratingDisplay !== 'N/A' ? `${totalReviews} reviews` : 'No reviews'}
                </div>
              </div>
            </div>
          </div>
          <button className="profile-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="profile-modal-content">
          {/* Pricing Section - Top */}
          {provider.charge && (
            <div className="profile-modal-section pricing-section">
              <div className="pricing-header">
                <i className="bi bi-cash"></i>
                <h4>Service Pricing</h4>
              </div>
              <div className="pricing-content">
                {discount > 0 ? (
                  <div className="price-display with-discount">
                    <div className="original-price">
                      <span className="price-amount original">{basePrice}</span>
                      <span className="price-label">original price</span>
                    </div>
                    <div className="discount-info">
                      <span className="discount-badge">
                        <i className="bi bi-tag"></i> {discount}% OFF
                      </span>
                      <span className="discount-amount">Save {discountAmount}</span>
                    </div>
                    <div className="final-price">
                      <span className="price-amount final">{finalPrice}</span>
                      <span className="price-label">final price</span>
                    </div>
                  </div>
                ) : (
                  <div className="price-display">
                    <span className="price-amount">{basePrice}</span>
                    <span className="price-label">per service</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact & Address Section - Middle */}
          <div className="profile-modal-section contact-section">
            <div className="section-header">
              <i className="bi bi-geo-alt"></i>
              <h4>Contact & Location</h4>
            </div>
            <div className="contact-grid">
              <div className="contact-item">
                <i className="bi bi-telephone"></i>
                <div>
                  <strong>Phone:</strong>
                  <span>{provider.phone}</span>
                </div>
              </div>
              <div className="contact-item">
                <i className="bi bi-envelope"></i>
                <div>
                  <strong>Email:</strong>
                  <span>{email || provider.email || 'Not provided'}</span>
                </div>
              </div>
              {provider.address && (
                <div className="contact-item address-item">
                  <i className="bi bi-geo-alt"></i>
                  <div>
                    <strong>Address:</strong>
                    <span>{provider.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Services & About Section - Bottom */}
          {provider.services && provider.services.length > 0 && (
            <div className="profile-modal-section services-section">
              <div className="section-header">
                <i className="bi bi-tools"></i>
                <h4>Services Offered</h4>
              </div>
              <div className="services-grid">
                {provider.services.map((service, index) => (
                  <span key={index} className="service-tag">{service}</span>
                ))}
              </div>
            </div>
          )}

          {provider.about && (
            <div className="profile-modal-section about-section">
              <div className="section-header">
                <i className="bi bi-info-circle"></i>
                <h4>About</h4>
              </div>
              <p className="about-text">{provider.about}</p>
            </div>
          )}
        </div>

        <div className="profile-modal-actions">
          <button className="btn btn-outline-primary" onClick={onOpenReviews} title="View Reviews">
            <i className="bi bi-chat-dots"></i>
          </button>
          <button className="btn btn-outline-primary" onClick={onSendMessage} title="Send Message">
            <i className="bi bi-envelope"></i>
          </button>
          <button className="btn btn-outline-primary" onClick={onShowRoute} title="Show Route">
            <i className="bi bi-signpost-2"></i>
          </button>
          <button className="btn btn-primary" onClick={onBookNow} title="Book Now">
            <i className="bi bi-calendar-check"></i>
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileCard;
