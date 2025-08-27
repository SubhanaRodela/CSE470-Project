import React from 'react';
import '../styles/ProfileCard.css';

const FavoritesModal = ({ isOpen, onClose, favorites, onOpenProfile, onShowOnMap, onRoute, onMessage, onRemoveFavorite }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="profile-modal-backdrop" onClick={onClose} />
      <div className={`profile-modal ${isOpen ? 'modal-open' : ''}`}>
        <div className="profile-modal-header">
          <div className="profile-avatar-initial">❤</div>
          <div className="profile-header-main">
            <div className="profile-header-row">
              <div className="profile-name-block">
                <div className="profile-name-row">
                  <div className="profile-name-large">Favourite Providers</div>
                </div>
                <div className="profile-occupation-small">Quick access to your saved providers</div>
              </div>
            </div>
          </div>
          <button className="profile-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="profile-modal-content">
          {favorites && favorites.length > 0 ? (
            <div className="services-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {favorites.map((fav) => (
                <div key={fav._id || fav.serviceProvider?.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#f9fafb' }}>
                  <button
                    className="btn btn-outline-primary"
                    style={{ flex: 1, justifyContent: 'flex-start' }}
                    title="Open Profile"
                    onClick={() => onOpenProfile(fav.serviceProvider)}
                  >
                    {fav.serviceProvider?.name}
                  </button>
                  <button
                    className="btn btn-outline-warning"
                    style={{ marginLeft: 8 }}
                    title="Remove from Favourites"
                    onClick={() => onRemoveFavorite(fav.serviceProvider)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-3">
              <p className="text-muted mb-2">No favourite providers yet</p>
              <small className="text-muted">Use the heart icon on a profile to save it here</small>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FavoritesModal;


