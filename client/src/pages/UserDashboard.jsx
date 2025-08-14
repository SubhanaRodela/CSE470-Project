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

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  
  // Service provider search states
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerSuggestions, setProviderSuggestions] = useState([]);
  const [showProviderSuggestions, setShowProviderSuggestions] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [allProviders, setAllProviders] = useState([]);
  
  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProviderForReview, setSelectedProviderForReview] = useState(null);
  
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
    
    // Load all service providers on component mount
    loadAllServiceProviders();
  }, [navigate]);

  // Load all service providers
  const loadAllServiceProviders = async () => {
    try {
      console.log('Loading all service providers...');
      const response = await fetch(
        'http://localhost:5000/api/auth/search-service-providers'
      );
      const data = await response.json();
      console.log('Service providers response:', data);
      console.log('Service providers count:', data.serviceProviders?.length || 0);
      
      if (data.serviceProviders && data.serviceProviders.length > 0) {
        console.log('First service provider:', data.serviceProviders[0]);
        console.log('First service provider ID:', data.serviceProviders[0].id);
      }
      
      setAllProviders(data.serviceProviders || []);
      
      // Also test the all-users endpoint
      const allUsersResponse = await fetch('http://localhost:5000/api/auth/all-users');
      const allUsersData = await allUsersResponse.json();
      console.log('All users in database:', allUsersData);
    } catch (error) {
      console.error('Error loading service providers:', error);
    }
  };

  // Geocoding function using Nominatim (OpenStreetMap's geocoding service)
  const searchLocation = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching location:', error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchLocation(query);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    const newMarker = {
      id: Date.now(),
      position: [parseFloat(suggestion.lat), parseFloat(suggestion.lon)],
      name: suggestion.display_name,
      type: suggestion.type
    };
    
    setMarkers([newMarker]);
    setSelectedLocation(newMarker);
    
    // Fly to the selected location
    if (mapRef.current) {
      mapRef.current.setView(newMarker.position, 15);
    }
  };

  // Service provider search function
  const searchServiceProviders = async (query) => {
    try {
      const url = query.length >= 2 
        ? `http://localhost:5000/api/auth/search-service-providers?query=${encodeURIComponent(query)}`
        : 'http://localhost:5000/api/auth/search-service-providers';
      
      const response = await fetch(url);
      const data = await response.json();
      setProviderSuggestions(data.serviceProviders || []);
      setShowProviderSuggestions(true);
    } catch (error) {
      console.error('Error searching service providers:', error);
    }
  };

  const handleProviderSearchChange = (e) => {
    const query = e.target.value;
    setProviderSearchQuery(query);
    searchServiceProviders(query);
  };

  const handleProviderSuggestionClick = (provider) => {
    setProviderSearchQuery(`${provider.name} - ${provider.occupation}`);
    setShowProviderSuggestions(false);
    setProviderSuggestions([]);
    
    const newMarker = {
      id: `provider-${provider.id}`,
      position: [provider.latitude, provider.longitude],
      name: provider.name,
      type: 'Service Provider',
      occupation: provider.occupation,
      phone: provider.phone
    };
    
    setMarkers(prev => [...prev.filter(m => !m.id.startsWith('provider-')), newMarker]);
    setSelectedProvider(provider);
    
    // Fly to the selected provider location
    if (mapRef.current) {
      mapRef.current.setView(newMarker.position, 15);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const openReviewModal = (provider) => {
    console.log('Opening review modal for provider:', provider);
    console.log('Provider ID:', provider.id);
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
                <span className="navbar-brand">Rodela</span>
                <div className="navbar-nav ms-auto">
                  <button 
                    className="btn btn-outline-light me-2"
                    onClick={() => navigate('/profile')}
                  >
                    Profile
                  </button>
                  <button 
                    className="btn btn-outline-light"
                    onClick={handleLogout}
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
            <h3>Location Search</h3>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedLocation && (
              <div className="selected-location">
                <h5>Selected Location:</h5>
                <p className="mb-1"><strong>{selectedLocation.name}</strong></p>
                <p className="text-muted small">
                  Type: {selectedLocation.type}
                </p>
              </div>
            )}

            <hr className="my-4" />
            
            <h3>Service Provider Search</h3>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or occupation..."
                value={providerSearchQuery}
                onChange={handleProviderSearchChange}
                onFocus={() => setShowProviderSuggestions(true)}
              />
              {showProviderSuggestions && providerSuggestions.length > 0 && (
                <div className="search-suggestions">
                  {providerSuggestions.map((provider, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleProviderSuggestionClick(provider)}
                    >
                      <div>
                        <strong>{provider.name}</strong>
                        <br />
                        <small className="text-muted">{provider.occupation}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedProvider && (
              <div className="selected-location">
                <h5>Selected Service Provider:</h5>
                <p className="mb-1"><strong>{selectedProvider.name}</strong></p>
                <p className="text-muted small mb-1">
                  Occupation: {selectedProvider.occupation}
                </p>
                <p className="text-muted small">
                  Phone: {selectedProvider.phone}
                </p>
              </div>
            )}

            <hr className="my-4" />
            
            <h5>All Service Providers</h5>
            <div className="all-providers-list">
              {allProviders.length > 0 ? (
                allProviders.map((provider, index) => (
                  <div
                    key={index}
                    className="provider-item"
                    onClick={() => handleProviderSuggestionClick(provider)}
                  >
                    <div className="provider-info">
                      <strong>{provider.name}</strong>
                      <br />
                      <small className="text-muted">{provider.occupation}</small>
                    </div>
                    <div className="provider-actions">
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleProviderSuggestionClick(provider)}
                      >
                        <i className="bi bi-geo-alt"></i> Show on Map
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-info"
                        onClick={() => openReviewModal(provider)}
                        title="View Reviews & Comments"
                      >
                        <i className="bi bi-chat-dots"></i>
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
              
              {markers.map((marker) => (
                <Marker key={marker.id} position={marker.position}>
                  <Popup>
                    <div>
                      <h6>{marker.name}</h6>
                      <p className="mb-1">Type: {marker.type}</p>
                      {marker.occupation && (
                        <p className="mb-1"><strong>Occupation:</strong> {marker.occupation}</p>
                      )}
                      {marker.phone && (
                        <p className="mb-0"><strong>Phone:</strong> {marker.phone}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
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

export default UserDashboard; 