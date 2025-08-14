import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Dashboard.css';
import '../styles/Map.css';
import ReviewModal from '../components/ReviewModal';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map Controls Component
const MapControls = ({ mapRef }) => {
  const map = useMap();

  const zoomIn = () => {
    map.zoomIn();
  };

  const zoomOut = () => {
    map.zoomOut();
  };

  const goHome = () => {
    map.setView([51.505, -0.09], 13);
  };

  return (
    <div className="map-controls">
      <button className="control-button" onClick={zoomIn} title="Zoom In">
        <i className="bi bi-plus-lg"></i>
      </button>
      <button className="control-button" onClick={zoomOut} title="Zoom Out">
        <i className="bi bi-dash-lg"></i>
      </button>
      <button className="control-button" onClick={goHome} title="Home">
        <i className="bi bi-house"></i>
      </button>
    </div>
  );
};

const UserDashboardDebug = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allProviders, setAllProviders] = useState([]);
  
  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProviderForReview, setSelectedProviderForReview] = useState(null);
  
  // Favorite states
  const [favorites, setFavorites] = useState([]);
  const [favoriteStatuses, setFavoriteStatuses] = useState({});
  
  const mapRef = useRef(null);

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
    console.log('🔍 DEBUG: User loaded:', userInfo);
    
    // Load all service providers and favorites on component mount
    loadAllServiceProviders();
    loadUserFavorites();
  }, [navigate]);

  // Load all service providers
  const loadAllServiceProviders = async () => {
    try {
      console.log('🔍 DEBUG: Loading all service providers...');
      const response = await fetch(
        'http://localhost:5000/api/auth/search-service-providers'
      );
      const data = await response.json();
      console.log('🔍 DEBUG: Service providers response:', data);
      
      if (data.serviceProviders && data.serviceProviders.length > 0) {
        console.log('🔍 DEBUG: First service provider:', data.serviceProviders[0]);
        console.log('🔍 DEBUG: First service provider ID:', data.serviceProviders[0].id);
      }
      
      setAllProviders(data.serviceProviders || []);
    } catch (error) {
      console.error('❌ DEBUG: Error loading service providers:', error);
    }
  };

  // Load user's favorite service providers
  const loadUserFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔍 DEBUG: No token found');
        return;
      }

      console.log('🔍 DEBUG: Loading user favorites...');
      const response = await fetch('http://localhost:5000/api/favorites/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 DEBUG: Favorites response status:', response.status);
      const data = await response.json();
      console.log('🔍 DEBUG: Favorites response data:', data);

      if (data.success) {
        setFavorites(data.favorites || []);
        
        // Create a map of favorite statuses for quick lookup
        const statusMap = {};
        data.favorites.forEach(fav => {
          statusMap[fav.serviceProvider.id] = true;
        });
        setFavoriteStatuses(statusMap);
        console.log('🔍 DEBUG: Favorite statuses map:', statusMap);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error loading favorites:', error);
    }
  };

  // Toggle favorite status for a service provider
  const toggleFavorite = async (provider) => {
    try {
      console.log('🔍 DEBUG: Toggle favorite called for provider:', provider);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔍 DEBUG: No token found, redirecting to login');
        navigate('/login');
        return;
      }

      const isCurrentlyFavorite = favoriteStatuses[provider.id];
      console.log('🔍 DEBUG: Is currently favorite:', isCurrentlyFavorite);
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        console.log('🔍 DEBUG: Removing from favorites...');
        const response = await fetch(`http://localhost:5000/api/favorites/${provider.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('🔍 DEBUG: Remove response status:', response.status);
        const data = await response.json();
        console.log('🔍 DEBUG: Remove response data:', data);

        if (data.success) {
          setFavoriteStatuses(prev => ({
            ...prev,
            [provider.id]: false
          }));
          setFavorites(prev => prev.filter(fav => fav.serviceProvider.id !== provider.id));
          console.log('🔍 DEBUG: Successfully removed from favorites');
        }
      } else {
        // Add to favorites
        console.log('🔍 DEBUG: Adding to favorites...');
        const response = await fetch('http://localhost:5000/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            serviceProviderId: provider.id
          })
        });

        console.log('🔍 DEBUG: Add response status:', response.status);
        const data = await response.json();
        console.log('🔍 DEBUG: Add response data:', data);

        if (data.success) {
          setFavoriteStatuses(prev => ({
            ...prev,
            [provider.id]: true
          }));
          setFavorites(prev => [...prev, data.favorite]);
          console.log('🔍 DEBUG: Successfully added to favorites');
        }
      }
    } catch (error) {
      console.error('❌ DEBUG: Error toggling favorite:', error);
      alert('Error updating favorite status: ' + error.message);
    }
  };

  const openReviewModal = (provider) => {
    console.log('🔍 DEBUG: Opening review modal for provider:', provider);
    setSelectedProviderForReview(provider);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedProviderForReview(null);
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
              <div className="container-fluid">
                <span className="navbar-brand">Rodela - DEBUG MODE</span>
                <div className="navbar-nav ms-auto">
                  <button 
                    className="btn btn-outline-light me-2"
                    onClick={() => navigate('/profile')}
                  >
                    Profile
                  </button>
                  <button 
                    className="btn btn-outline-light"
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/');
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>

        <div className="map-container">
          {/* Sidebar */}
          <div className="sidebar">
            <h3>DEBUG: Favorites System</h3>
            
            <div className="debug-info">
              <h5>Current State:</h5>
              <p><strong>User:</strong> {user.name} (ID: {user.id})</p>
              <p><strong>Providers Count:</strong> {allProviders.length}</p>
              <p><strong>Favorites Count:</strong> {favorites.length}</p>
              <p><strong>Favorite Statuses:</strong> {JSON.stringify(favoriteStatuses)}</p>
            </div>

            <hr className="my-4" />
            
            <h5>All Service Providers (with Debug Info)</h5>
            <div className="all-providers-list">
              {allProviders.length > 0 ? (
                allProviders.map((provider, index) => (
                  <div key={index} className="provider-item">
                    <div className="provider-info">
                      <strong>{provider.name}</strong>
                      <br />
                      <small className="text-muted">{provider.occupation}</small>
                      <br />
                      <small className="text-muted">ID: {provider.id}</small>
                      <br />
                      <small className="text-muted">Favorite Status: {favoriteStatuses[provider.id] ? '❤️ Favorited' : '🤍 Not Favorited'}</small>
                    </div>
                    <div className="provider-actions">
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => console.log('🔍 DEBUG: Show on map clicked for:', provider)}
                      >
                        <i className="bi bi-geo-alt"></i> Show on Map
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() => openReviewModal(provider)}
                        title="View Reviews & Comments"
                      >
                        <i className="bi bi-chat-dots"></i>
                      </button>
                      <button 
                        className={`btn btn-sm ${favoriteStatuses[provider.id] ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🔍 DEBUG: Heart button clicked for provider:', provider);
                          toggleFavorite(provider);
                        }}
                        title={favoriteStatuses[provider.id] ? 'Remove from Favorites' : 'Add to Favorites'}
                      >
                        <i className={`bi ${favoriteStatuses[provider.id] ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                        {favoriteStatuses[provider.id] ? ' Remove' : ' Add'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-3">
                  <p className="text-muted mb-2">No service providers found</p>
                  <small className="text-muted">
                    Service providers will appear here once they register
                  </small>
                </div>
              )}
            </div>

            <hr className="my-4" />
            
            <h5>My Favorite Providers (Debug View)</h5>
            <div className="favorites-list">
              {favorites.length > 0 ? (
                favorites.map((favorite, index) => (
                  <div key={index} className="favorite-item">
                    <div className="favorite-info">
                      <strong>{favorite.serviceProvider.name}</strong>
                      <br />
                      <small className="text-muted">{favorite.serviceProvider.occupation}</small>
                      <br />
                      <small className="text-muted">Provider ID: {favorite.serviceProvider.id}</small>
                      <br />
                      <small className="text-muted">Added: {new Date(favorite.addedAt).toLocaleDateString()}</small>
                    </div>
                    <div className="favorite-actions">
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => console.log('🔍 DEBUG: Show on map clicked for favorite:', favorite.serviceProvider)}
                      >
                        <i className="bi bi-geo-alt"></i> Show on Map
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-info me-2"
                        onClick={() => openReviewModal(favorite.serviceProvider)}
                        title="View Reviews & Comments"
                      >
                        <i className="bi bi-chat-dots"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          console.log('🔍 DEBUG: Remove from favorites clicked for:', favorite.serviceProvider);
                          toggleFavorite(favorite.serviceProvider);
                        }}
                        title="Remove from Favorites"
                      >
                        <i className="bi bi-heart-fill"></i> Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-3">
                  <p className="text-muted mb-2">No favorite providers yet</p>
                  <small className="text-muted">
                    Click the heart icon next to any service provider to add them to your favorites
                  </small>
                </div>
              )}
            </div>

            <hr className="my-4" />
            
            <h5>Debug Actions</h5>
            <div className="debug-actions">
              <button 
                className="btn btn-warning me-2"
                onClick={() => {
                  console.log('🔍 DEBUG: Reloading favorites...');
                  loadUserFavorites();
                }}
              >
                Reload Favorites
              </button>
              <button 
                className="btn btn-info me-2"
                onClick={() => {
                  console.log('🔍 DEBUG: Current state:', {
                    user,
                    allProviders,
                    favorites,
                    favoriteStatuses
                  });
                }}
              >
                Log Current State
              </button>
            </div>
          </div>

          {/* Map Area */}
          <div className="map-area">
            <MapContainer
              center={[51.505, -0.09]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              />
              <MapControls mapRef={mapRef} />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={closeReviewModal}
        serviceProvider={selectedProviderForReview}
        user={user}
      />
    </div>
  );
};

export default UserDashboardDebug; 