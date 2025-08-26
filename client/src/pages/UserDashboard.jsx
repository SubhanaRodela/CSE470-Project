import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Dashboard.css';
import '../styles/Map.css';
import ReviewModal from '../components/ReviewModal';
import MessageNotification from '../components/MessageNotification';
import ProfileCard from '../components/ProfileCard';
import BookingModal from '../components/BookingModal';
import Navbar from './navbar';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon with info card
const createCustomMarkerIcon = (marker) => {
  const divIcon = L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div class="marker-info-card" data-provider-id="${marker.providerId || marker.id}">
        <div class="marker-card-header">
          <h6 class="marker-name">${marker.name}</h6>
          <div class="marker-rating">
            <i class="bi bi-star-fill text-warning"></i>
            <span class="rating-number">${marker.averageRating || 'N/A'}</span>
          </div>
        </div>
        <div class="marker-card-body">
          <p class="marker-occupation">
            <i class="bi bi-briefcase me-1"></i>
            ${marker.occupation || 'N/A'}
          </p>
          ${marker.charge ? `
            <p class="marker-charge">
              <i class="bi bi-currency-dollar me-1"></i>
              ৳${marker.charge}
            </p>
          ` : ''}
        </div>

      </div>
    `,
    iconSize: [160, 90],
    iconAnchor: [80, 90],
    popupAnchor: [0, -90]
  });
  
  return divIcon;
};

// Map Controls Component
const MapControls = ({ mapRef, userLocation, onGoHome }) => {
  const map = useMap();

  const zoomIn = () => {
    map.zoomIn();
  };

  const zoomOut = () => {
    map.zoomOut();
  };

  const goHome = () => {
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      map.setView([userLocation.latitude, userLocation.longitude], 15);
      onGoHome(); // Trigger the callback to show user marker
    } else {
      // Fallback to user's home location if available, otherwise default
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.latitude && user.longitude) {
        map.setView([user.latitude, user.longitude], 15);
      } else {
        // Final fallback to default location
        map.setView([51.505, -0.09], 13);
      }
    }
  };

  return (
    <div className="map-controls">
      <button className="control-button" onClick={zoomIn} title="Zoom In">
        <i className="bi bi-plus-lg"></i>
      </button>
      <button className="control-button" onClick={zoomOut} title="Zoom Out">
        <i className="bi bi-dash-lg"></i>
      </button>
      <button className="control-button" onClick={goHome} title="Go to My Location">
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
  
  // Occupation suggestions states
  const [occupationSuggestions, setOccupationSuggestions] = useState([]);
  const [showOccupationSuggestions, setShowOccupationSuggestions] = useState(false);
  
  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProviderForReview, setSelectedProviderForReview] = useState(null);
  
  // Profile card states
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [selectedProviderForProfile, setSelectedProviderForProfile] = useState(null);
  
  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedProviderForBooking, setSelectedProviderForBooking] = useState(null);
  
  // Favorite states
  const [favorites, setFavorites] = useState([]);
  const [favoriteStatuses, setFavoriteStatuses] = useState({});
  const [loadingFavorites, setLoadingFavorites] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // Sidebar resize states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseFloat(saved) : 20;
  }); // percentage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // User location marker state
  const [showUserMarker, setShowUserMarker] = useState(false);
  
  // Route states
  const [routeData, setRouteData] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  
  // Floating search UI state
  const [isSearchExpanded, setIsSearchExpanded] = useState(() => {
    const saved = localStorage.getItem('floatingSearchExpanded');
    return saved ? JSON.parse(saved) : false;
  });
  const [floatingSearchPos, setFloatingSearchPos] = useState(() => {
    const saved = localStorage.getItem('floatingSearchPos');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* noop */ }
    }
    return { x: 24, y: 24 };
  });
  const [floatingSearchQuery, setFloatingSearchQuery] = useState('');
  const [floatingSuggestions, setFloatingSuggestions] = useState([]);
  const [showFloatingSuggestions, setShowFloatingSuggestions] = useState(false);
  const floatingSearchRef = useRef(null);
  const mapAreaRef = useRef(null);
  const draggingRef = useRef({ active: false, offsetX: 0, offsetY: 0 });

  const mapRef = useRef(null);
  const sidebarRef = useRef(null);
  const resizeHandleRef = useRef(null);

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
    
    // Load all service providers and favorites on component mount
    loadAllServiceProviders();
    loadUserFavorites();
  }, [navigate]);

  // Load all service providers
  const loadAllServiceProviders = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/search-service-providers'
      );
      const data = await response.json();
      
      console.log('Service providers data received:', data);
      console.log('Service providers array:', data.serviceProviders);
      
      // Fetch ratings for all providers
      const providersWithRatings = await Promise.all(
        (data.serviceProviders || []).map(async (provider) => {
          const ratingData = await fetchProviderRating(provider.id);
          return { 
            ...provider, 
            averageRating: ratingData.averageRating,
            totalReviews: ratingData.totalReviews
          };
        })
      );
      
      setAllProviders(providersWithRatings);
      
      // Also test the all-users endpoint
      const allUsersResponse = await fetch('http://localhost:5000/api/auth/all-users');
      const allUsersData = await allUsersResponse.json();
    } catch (error) {
      console.error('Error loading service providers:', error);
    }
  };

  // Fetch average rating for a service provider
  const fetchProviderRating = async (providerId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reviews/service-provider/${providerId}`);
      const data = await response.json();
      
      if (data.success && data.reviews && data.reviews.length > 0) {
        const totalRating = data.reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = (totalRating / data.reviews.length).toFixed(1);
        return {
          averageRating,
          totalReviews: data.reviews.length
        };
      }
      return {
        averageRating: 'N/A',
        totalReviews: 0
      };
    } catch (error) {
      console.error('Error fetching provider rating:', error);
      return {
        averageRating: 'N/A',
        totalReviews: 0
      };
    }
  };

  // Get unique occupations from all providers
  const getUniqueOccupations = () => {
    const occupations = allProviders.map(provider => provider.occupation);
    return [...new Set(occupations)].sort();
  };

  // Load user's favorite service providers
  const loadUserFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch('http://localhost:5000/api/favorites/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const favoritesList = data.favorites || [];
        
        // Fetch ratings for favorite providers
        const favoritesWithRatings = await Promise.all(
          favoritesList.map(async (favorite) => {
            if (favorite.serviceProvider && favorite.serviceProvider.id) {
              const ratingData = await fetchProviderRating(favorite.serviceProvider.id);
              return {
                ...favorite,
                serviceProvider: {
                  ...favorite.serviceProvider,
                  averageRating: ratingData.averageRating,
                  totalReviews: ratingData.totalReviews
                }
              };
            }
            return favorite;
          })
        );
        
        setFavorites(favoritesWithRatings);
        
        // Create a map of favorite statuses for quick lookup
        const statusMap = {};
        favoritesWithRatings.forEach(fav => {
          if (fav.serviceProvider && fav.serviceProvider.id) {
            statusMap[fav.serviceProvider.id] = true;
          }
        });
        setFavoriteStatuses(statusMap);
      } else {
        console.error('❌ Failed to load favorites:', data.message);
        setFavorites([]);
        setFavoriteStatuses({});
      }
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
      setFavorites([]);
      setFavoriteStatuses({});
    }
  };

  // Toggle favorite status for a service provider
  const toggleFavorite = async (provider) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Prevent multiple clicks
      if (loadingFavorites[provider.id]) {
        return;
      }

      // Set loading state
      setLoadingFavorites(prev => ({
        ...prev,
        [provider.id]: true
      }));

      const isCurrentlyFavorite = favoriteStatuses[provider.id];
      
      // Optimistically update UI for better UX
      if (isCurrentlyFavorite) {
        // Optimistically remove from UI
        setFavoriteStatuses(prev => ({
          ...prev,
          [provider.id]: false
        }));
        setFavorites(prev => prev.filter(fav => fav.serviceProvider.id !== provider.id));
      } else {
        // Optimistically add to UI
        setFavoriteStatuses(prev => ({
          ...prev,
          [provider.id]: true
        }));
        // Create a temporary favorite object for immediate display
        const tempFavorite = {
          _id: Date.now(), // temporary ID
          user: user.id,
          serviceProvider: provider,
          createdAt: new Date().toISOString(),
          addedAt: new Date().toISOString()
        };
        setFavorites(prev => [...prev, tempFavorite]);
      }
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const response = await fetch(`http://localhost:5000/api/favorites/${provider.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        
        if (data.success) {
          showNotification(`${provider.name} removed from favorites`, 'success');
          // State already updated optimistically
        } else {
          console.error('❌ Failed to remove from favorites:', data.message);
          // Revert optimistic update
          setFavoriteStatuses(prev => ({
            ...prev,
            [provider.id]: true
          }));
          // Reload favorites to get correct state
          await loadUserFavorites();
          showNotification(`Failed to remove from favorites: ${data.message}`, 'error');
        }
      } else {
        // Add to favorites
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

        const data = await response.json();
        
        if (data.success) {
          showNotification(`${provider.name} added to favorites`, 'success');
          // Replace temporary favorite with real one
          setFavorites(prev => prev.map(fav => 
            fav._id === Date.now() ? data.favorite : fav
          ));
        } else {
          console.error('❌ Failed to add to favorites:', data.message);
          // Revert optimistic update
          setFavoriteStatuses(prev => ({
            ...prev,
            [provider.id]: false
          }));
          setFavorites(prev => prev.filter(fav => fav._id !== Date.now()));
          showNotification(`Failed to add to favorites: ${data.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      // Revert optimistic updates on error
      await loadUserFavorites();
      showNotification(`Error updating favorite status: ${error.message}`, 'error');
    } finally {
      // Clear loading state
      setLoadingFavorites(prev => ({
        ...prev,
        [provider.id]: false
      }));
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
      // Don't automatically show provider suggestions - let the calling function decide
    } catch (error) {
      console.error('Error searching service providers:', error);
    }
  };

  // Show provider suggestions explicitly
  const displayProviderSuggestions = () => {
    if (providerSuggestions.length > 0) {
      setShowProviderSuggestions(true);
      setShowOccupationSuggestions(false);
    }
  };

  // Search by occupation and show on map
  const searchByOccupation = async (occupation) => {
    try {
      // Update the search query immediately for better UX
      setProviderSearchQuery(occupation);
      setShowProviderSuggestions(false);
      setShowOccupationSuggestions(false);
      
      const response = await fetch(
        `http://localhost:5000/api/auth/search-service-providers?query=${encodeURIComponent(occupation)}`
      );
      const data = await response.json();
      
      if (data.serviceProviders && data.serviceProviders.length > 0) {
        // Clear existing markers and add new ones for all matching providers
        const newMarkers = await Promise.all(data.serviceProviders.map(async (provider) => {
          const ratingData = await fetchProviderRating(provider.id);
          return {
            id: `provider-${provider.id}`,
            providerId: provider.id,
            position: [provider.latitude, provider.longitude],
            name: provider.name,
            type: 'Service Provider',
            occupation: provider.occupation,
            phone: provider.phone,
            charge: provider.charge,
            averageRating: ratingData.averageRating,
            totalReviews: ratingData.totalReviews
          };
        }));
        
        setMarkers(newMarkers);
        
        // If there are multiple providers, center the map to show all
        if (newMarkers.length > 1) {
          const bounds = newMarkers.reduce((bounds, marker) => {
            bounds.extend(marker.position);
            return bounds;
          }, L.latLngBounds());
          
          if (mapRef.current) {
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }
        } else if (newMarkers.length === 1 && mapRef.current) {
          // If only one provider, center on it
          mapRef.current.setView(newMarkers[0].position, 15);
        }
        
        console.log(`Found ${newMarkers.length} ${occupation}(s) on the map`);
        
        // Show notification
        showNotification(`Found ${newMarkers.length} ${occupation}(s) on the map`, 'success');
      } else {
        // Show notification if no providers found
        showNotification(`No ${occupation} providers found`, 'info');
      }
    } catch (error) {
      console.error('Error searching by occupation:', error);
      showNotification(`Error searching for ${occupation}`, 'error');
    }
  };

  const handleProviderSearchChange = (e) => {
    const query = e.target.value;
    setProviderSearchQuery(query);
    
    if (query.length >= 2) {
      // Show occupation suggestions first
      const uniqueOccupations = getUniqueOccupations();
      const matchingOccupations = uniqueOccupations.filter(occupation =>
        occupation.toLowerCase().includes(query.toLowerCase())
      );
      
      // Only show occupation suggestions if there are matching occupations
      if (matchingOccupations.length > 0) {
        setOccupationSuggestions(matchingOccupations);
        setShowOccupationSuggestions(true);
        setShowProviderSuggestions(false); // Hide provider suggestions when showing occupation suggestions
      } else {
        // If no occupation matches, then search for service providers
        setOccupationSuggestions([]);
        setShowOccupationSuggestions(false);
        searchServiceProviders(query);
      }
    } else {
      setOccupationSuggestions([]);
      setShowOccupationSuggestions(false);
      setShowProviderSuggestions(false);
    }
  };

  const handleProviderSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = e.target.value.trim();
      
      if (query.length >= 2) {
        // Search by occupation and show all matching providers on map
        searchByOccupation(query);
      }
    }
  };

  const handleProviderSuggestionClick = async (provider) => {
    setProviderSearchQuery(`${provider.name} - ${provider.occupation}`);
    setShowProviderSuggestions(false);
    setProviderSuggestions([]);
    
    const ratingData = await fetchProviderRating(provider.id);
    const newMarker = {
      id: `provider-${provider.id}`,
      providerId: provider.id,
      position: [provider.latitude, provider.longitude],
      name: provider.name,
      type: 'Service Provider',
      occupation: provider.occupation,
      phone: provider.phone,
      charge: provider.charge,
      averageRating: ratingData.averageRating,
      totalReviews: ratingData.totalReviews
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
    setSelectedProviderForReview(provider);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedProviderForReview(null);
  };

  // Booking modal functions
  const openBookingModal = (provider) => {
    setSelectedProviderForBooking(provider);
    setShowBookingModal(true);
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedProviderForBooking(null);
  };

  const handleBookingSuccess = (booking) => {
    showNotification(`Booking created successfully for ${booking.serviceProvider.name}!`, 'success');
  };

  // Profile card functions
  const openProfileCard = (provider) => {
    console.log('Opening profile card for provider:', provider);
    console.log('Provider charge field:', provider.charge);
    
    // Find the marker data to get rating information
    const marker = markers.find(m => m.providerId === provider.id || m.id === `provider-${provider.id}`);
    console.log('Found marker data:', marker);
    
    // Create provider object with rating data
    const providerWithRatings = {
      ...provider,
      averageRating: marker?.averageRating || provider.averageRating || 0,
      totalReviews: marker?.totalReviews || provider.totalReviews || 0
    };
    
    console.log('Provider with ratings:', providerWithRatings);
    setSelectedProviderForProfile(providerWithRatings);
    setShowProfileCard(true);
  };

  // Handle marker card click to open profile
  const handleMarkerClick = async (marker) => {
    console.log('Marker clicked:', marker);
    if (marker.providerId) {
      // Find the provider data from allProviders
      const provider = allProviders.find(p => p.id === marker.providerId);
      console.log('Found provider:', provider);
      if (provider) {
        // Create provider object with rating data from marker
        const providerWithRatings = {
          ...provider,
          averageRating: marker.averageRating || 0,
          totalReviews: marker.totalReviews || 0
        };
        console.log('Provider with ratings from marker:', providerWithRatings);
        setSelectedProviderForProfile(providerWithRatings);
        setShowProfileCard(true);
      }
    }
  };

  // Handle route calculation from marker
  const handleMarkerRoute = async (marker) => {
    if (marker.providerId) {
      const provider = allProviders.find(p => p.id === marker.providerId);
      if (provider) {
        await calculateRoute(provider);
      }
    }
  };

  const closeProfileCard = () => {
    setShowProfileCard(false);
    setSelectedProviderForProfile(null);
  };

  const handleProfileCardShowOnMap = () => {
    if (selectedProviderForProfile) {
      handleProviderSuggestionClick(selectedProviderForProfile);
      closeProfileCard();
    }
  };

  const handleProfileCardOpenReviews = () => {
    if (selectedProviderForProfile) {
      openReviewModal(selectedProviderForProfile);
      closeProfileCard();
    }
  };

  const handleProfileCardSendMessage = () => {
    if (selectedProviderForProfile) {
      navigate(`/chatbox?providerId=${selectedProviderForProfile.id}`);
      closeProfileCard();
    }
  };

  // Handle going to user's home location
  const handleGoHome = () => {
    if (user && user.latitude && user.longitude) {
      // Only show user marker if it's not already shown
      if (!showUserMarker) {
        setShowUserMarker(true);
      }
      // The marker will be automatically added to the markers array
    }
  };

  // Calculate route between user and provider using free routing API
  const calculateRoute = async (provider) => {
    if (!user || !user.latitude || !user.longitude || !provider.latitude || !provider.longitude) {
      setRouteError('Location data not available');
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError(null);
    setRouteData(null);
    setRoutePolyline(null);

    // Show both user and provider markers when calculating route
    setShowUserMarker(true);

    try {
      // Using OSRM (Open Source Routing Machine) - completely free and reliable
      const startPoint = `${user.longitude},${user.latitude}`;
      const endPoint = `${provider.longitude},${provider.latitude}`;
      
      const url = `https://router.project-osrm.org/route/v1/driving/${startPoint};${endPoint}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]
        
        // Extract route information
        const distance = route.distance; // in meters
        const duration = route.duration; // in seconds
        
        const routeInfo = {
          distance: (distance / 1000).toFixed(2), // Convert to km
          duration: Math.round(duration / 60), // Convert to minutes
          coordinates: coordinates,
          provider: provider,
          isEstimated: false
        };

        setRouteData(routeInfo);
        setRoutePolyline(coordinates);
        
        // Fit map to show the entire route
        if (mapRef.current) {
          const bounds = L.latLngBounds(coordinates);
          mapRef.current.fitBounds(bounds, { padding: [20, 20] });
        }

        showNotification(`Route calculated: ${routeInfo.distance} km, ${routeInfo.duration} min`, 'success');
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      
      // Try alternative free routing service - Valhalla
      try {
        const startPoint = `${user.longitude},${user.latitude}`;
        const endPoint = `${provider.longitude},${provider.latitude}`;
        
        const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json={"locations":[{"lat":${user.latitude},"lon":${user.longitude}},{"lat":${provider.latitude},"lon":${provider.longitude}}],"costing":"auto","units":"kilometers"}`;
        
        const valhallaResponse = await fetch(valhallaUrl);
        
        if (valhallaResponse.ok) {
          const valhallaData = await valhallaResponse.json();
          
          if (valhallaData.trip && valhallaData.trip.legs && valhallaData.trip.legs.length > 0) {
            const leg = valhallaData.trip.legs[0];
            const coordinates = leg.shape.map(coord => {
              const [lat, lng] = coord.split(',');
              return [parseFloat(lat), parseFloat(lng)];
            });
            
            const routeInfo = {
              distance: (leg.length / 1000).toFixed(2), // Convert to km
              duration: Math.round(leg.time / 60), // Convert to minutes
              coordinates: coordinates,
              provider: provider,
              isEstimated: false
            };

            setRouteData(routeInfo);
            setRoutePolyline(coordinates);
            
            // Fit map to show the entire route
            if (mapRef.current) {
              const bounds = L.latLngBounds(coordinates);
              mapRef.current.fitBounds(bounds, { padding: [20, 20] });
            }

            showNotification(`Route calculated: ${routeInfo.distance} km, ${routeInfo.duration} min`, 'success');
            return;
          }
        }
        
        throw new Error('Both routing services failed');
      } catch (valhallaError) {
        console.error('Valhalla routing also failed:', valhallaError);
        
        // Final fallback: Create a realistic route simulation using road-like curves
        try {
          const userLat = user.latitude;
          const userLng = user.longitude;
          const providerLat = provider.latitude;
          const providerLng = provider.longitude;
          
          // Calculate straight-line distance using Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = (providerLat - userLat) * Math.PI / 180;
          const dLng = (providerLng - userLng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(userLat * Math.PI / 180) * Math.cos(providerLat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          // Create a more realistic route simulation with curves (not straight line)
          const steps = 20;
          const coordinates = [];
          
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = userLat + (providerLat - userLat) * t;
            const lng = userLng + (providerLng - userLng) * t;
            
            // Add some realistic curve variation to simulate road routing
            if (i > 0 && i < steps) {
              const curveFactor = 0.1; // Adjust this for more/less curve
              const midPoint = (userLat + providerLat) / 2;
              const curveOffset = Math.sin(t * Math.PI) * curveFactor * (providerLat - userLat);
              coordinates.push([lat + curveOffset, lng]);
            } else {
              coordinates.push([lat, lng]);
            }
          }
          
          // Estimate travel time (assuming 40 km/h average speed for realistic roads)
          const estimatedTime = Math.round(distance * 1.5); // 1.5 minutes per km for realistic roads
          
          const routeInfo = {
            distance: (distance * 1.2).toFixed(2), // Add 20% for realistic road distance
            duration: estimatedTime,
            coordinates: coordinates,
            provider: provider,
            isEstimated: true
          };

          setRouteData(routeInfo);
          setRoutePolyline(coordinates);
          
          // Fit map to show the entire route
          if (mapRef.current) {
            const bounds = L.latLngBounds(coordinates);
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }

          showNotification(`Simulated route: ${routeInfo.distance} km, ~${routeInfo.duration} min (road simulation)`, 'info');
        } catch (fallbackError) {
          console.error('All routing methods failed:', fallbackError);
          setRouteError('Failed to calculate route. Please try again.');
          showNotification('Failed to calculate route', 'error');
        }
      }
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Clear route
  const clearRoute = () => {
    setRouteData(null);
    setRoutePolyline(null);
    setRouteError(null);
    setShowUserMarker(false); // Hide user marker when clearing route
    showNotification('Route cleared', 'info');
  };

  // Sidebar resize functionality
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    
    const containerWidth = window.innerWidth;
    const newWidth = (e.clientX / containerWidth) * 100;
    
    // Constrain width between 15% and 50%
    const constrainedWidth = Math.max(15, Math.min(50, newWidth));
    setSidebarWidth(constrainedWidth);
    localStorage.setItem('sidebarWidth', constrainedWidth.toString());
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Persist floating search UI state
  useEffect(() => {
    localStorage.setItem('floatingSearchExpanded', JSON.stringify(isSearchExpanded));
  }, [isSearchExpanded]);
  useEffect(() => {
    localStorage.setItem('floatingSearchPos', JSON.stringify(floatingSearchPos));
  }, [floatingSearchPos]);

  // Close floating suggestions when clicking outside
  useEffect(() => {
    const onDocMouseDown = (e) => {
      const node = floatingSearchRef.current;
      if (!node) return;
      if (!node.contains(e.target)) {
        setShowFloatingSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // Floating search helpers
  const updateFloatingSuggestions = (query) => {
    if (!query || query.trim().length < 1) {
      setFloatingSuggestions([]);
      setShowFloatingSuggestions(false);
      return;
    }
    const uniques = getUniqueOccupations();
    const filtered = uniques
      .filter(o => o && o.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
    setFloatingSuggestions(filtered);
    setShowFloatingSuggestions(filtered.length > 0);
  };

  const executeFloatingSearch = (term) => {
    const q = (term ?? floatingSearchQuery).trim();
    if (q.length >= 2) {
      searchByOccupation(q);
      setShowFloatingSuggestions(false);
    }
  };

  // Drag handlers for floating search
  const handleFloatingSearchMouseDown = (e) => {
    const node = floatingSearchRef.current;
    if (!node) return;
    draggingRef.current.active = true;
    const rect = node.getBoundingClientRect();
    draggingRef.current.offsetX = e.clientX - rect.left;
    draggingRef.current.offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  };
  const handleFloatingSearchMouseMove = (e) => {
    if (!draggingRef.current.active) return;
    const container = mapAreaRef.current;
    const node = floatingSearchRef.current;
    if (!container || !node) return;
    const bounds = container.getBoundingClientRect();
    let newX = e.clientX - bounds.left - draggingRef.current.offsetX;
    let newY = e.clientY - bounds.top - draggingRef.current.offsetY;
    // Constrain within map area
    newX = Math.max(0, Math.min(newX, bounds.width - node.offsetWidth));
    newY = Math.max(0, Math.min(newY, bounds.height - node.offsetHeight));
    setFloatingSearchPos({ x: newX, y: newY });
  };
  const handleFloatingSearchMouseUp = () => {
    if (draggingRef.current.active) {
      draggingRef.current.active = false;
      document.body.style.userSelect = '';
    }
  };
  useEffect(() => {
    const move = (e) => handleFloatingSearchMouseMove(e);
    const up = () => handleFloatingSearchMouseUp();
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, []);

  const toggleSidebar = () => {
    const newCollapsedState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsedState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsedState));
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      
      // Close profile card with Escape key
      if (e.key === 'Escape' && showProfileCard) {
        closeProfileCard();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarCollapsed, showProfileCard]);

  // Add click event listeners to marker cards
  useEffect(() => {
    const handleMarkerCardClick = (e) => {
      const markerCard = e.target.closest('.marker-info-card');
      if (markerCard) {
        const providerId = markerCard.dataset.providerId;
        if (providerId) {
          const marker = markers.find(m => m.providerId === providerId || m.id === providerId);
          if (marker) {
            handleMarkerClick(marker);
          }
        }
      }
    };

    // Handle route button clicks in marker cards
    const handleMarkerRouteClick = (e) => {
      if (e.target.closest('.marker-route-btn')) {
        e.stopPropagation();
        const markerCard = e.target.closest('.marker-info-card');
        if (markerCard) {
          const providerId = markerCard.dataset.providerId;
          if (providerId) {
            const marker = markers.find(m => m.providerId === providerId || m.id === providerId);
            if (marker) {
              handleMarkerRoute(marker);
            }
          }
        }
      }
    };

    document.addEventListener('click', handleMarkerCardClick);
    document.addEventListener('click', handleMarkerRouteClick);
    return () => {
      document.removeEventListener('click', handleMarkerCardClick);
      document.removeEventListener('click', handleMarkerRouteClick);
    };
  }, [markers]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close occupation suggestions if clicking outside
      if (showOccupationSuggestions) {
        setShowOccupationSuggestions(false);
      }
      
      // Close provider suggestions if clicking outside
      if (showProviderSuggestions) {
        setShowProviderSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOccupationSuggestions, showProviderSuggestions]);

  // Add a small delay before hiding occupation suggestions to prevent flickering
  useEffect(() => {
    if (occupationSuggestions.length === 0 && showOccupationSuggestions) {
      const timer = setTimeout(() => {
        setShowOccupationSuggestions(false);
      }, 100); // Small delay to prevent flickering
      
      return () => clearTimeout(timer);
    }
  }, [occupationSuggestions.length, showOccupationSuggestions]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

    return (
    <div className="dashboard-container">
      <Navbar />
      <div className="container-fluid">

        <div className="map-container">
          {/* Sidebar */}
          <div 
            className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
            ref={sidebarRef}
            style={{ width: isSidebarCollapsed ? '50px' : `${sidebarWidth}%` }}
          >
            {/* Resize Handle */}
            <div 
              className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`}
              ref={resizeHandleRef}
              onMouseDown={handleResizeStart}
            />
            
            {/* Toggle Button */}
            <button 
              className="sidebar-toggle"
              onClick={toggleSidebar}
              title={`${isSidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar (Ctrl+B)`}
            >
              <i className={`bi bi-chevron-${isSidebarCollapsed ? 'right' : 'left'}`}></i>
            </button>
            
            {/* Sidebar Content */}
            <div className="sidebar-content">
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
              <div className="search-input-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name or occupation... (Press Enter to search by occupation)"
                  value={providerSearchQuery}
                  onChange={handleProviderSearchChange}
                  onKeyDown={handleProviderSearchKeyDown}
                  onFocus={() => setShowProviderSuggestions(true)}
                />
                <button
                  className="search-button"
                  onClick={() => {
                    if (providerSearchQuery.trim().length >= 2) {
                      searchByOccupation(providerSearchQuery.trim());
                    }
                  }}
                  title="Search manually (or click suggestions above)"
                >
                  <i className="bi bi-search"></i>
                </button>
              </div>
              
              {/* Occupation Suggestions */}
              {showOccupationSuggestions && occupationSuggestions.length > 0 && (
                <div className="search-suggestions">
                  {occupationSuggestions.map((occupation, index) => (
                    <div
                      key={index}
                      className="suggestion-item occupation-suggestion"
                      onClick={() => {
                        searchByOccupation(occupation);
                        setProviderSearchQuery(occupation);
                        setShowOccupationSuggestions(false);
                      }}
                    >
                      <i className="bi bi-briefcase me-2"></i>
                      <strong>{occupation}</strong>
                      <small className="text-muted ms-2">
                        ({allProviders.filter(p => p.occupation === occupation).length} providers)
                      </small>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Provider Suggestions Available Indicator */}
              {!showOccupationSuggestions && providerSuggestions.length > 0 && !showProviderSuggestions && (
                <div className="provider-suggestions-indicator">
                  <button
                    className="btn btn-sm btn-outline-info"
                    onClick={displayProviderSuggestions}
                    type="button"
                  >
                    <i className="bi bi-people me-1"></i>
                    Show {providerSuggestions.length} provider suggestion{providerSuggestions.length !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
              
              {showProviderSuggestions && providerSuggestions.length > 0 && (
                <div className="search-suggestions">
                  {providerSuggestions.map((provider, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                    >
                      <div 
                        className="suggestion-info"
                        onClick={() => {
                          handleProviderSuggestionClick(provider);
                          setShowProviderSuggestions(false);
                        }}
                      >
                        <strong>{provider.name}</strong>
                        <br />
                        <small className="text-muted">{provider.occupation}</small>
                      </div>
                      <div className="suggestion-actions">
                        <button 
                          className="btn btn-sm btn-outline-secondary me-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProfileCard(provider);
                            setShowProviderSuggestions(false);
                          }}
                          title="View Profile"
                        >
                          <i className="bi bi-person"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProviderSuggestionClick(provider);
                            setShowProviderSuggestions(false);
                          }}
                          title="Show on Map"
                        >
                          <i className="bi bi-geo-alt"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-warning me-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            calculateRoute(provider);
                            setShowProviderSuggestions(false);
                          }}
                          title="Show Route"
                        >
                          <i className="bi bi-signpost-2"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chatbox?providerId=${provider.id}`);
                            setShowProviderSuggestions(false);
                          }}
                          title="Send Message"
                        >
                          <i className="bi bi-envelope"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedProvider && (
              <div className="selected-location">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="mb-0">Selected Service Provider:</h5>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => openProfileCard(selectedProvider)}
                    title="View Profile"
                  >
                    <i className="bi bi-person"></i> View Profile
                  </button>
                </div>
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
                      <div className="provider-rating-charge">
                        <small className="text-warning me-2">
                          <i className="bi bi-star-fill"></i> {provider.averageRating || 'N/A'}
                        </small>
                        {provider.charge && (
                          <small className="text-success">
                            <i className="bi bi-currency-dollar"></i> ৳{provider.charge}
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="provider-actions">
                      <button 
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProfileCard(provider);
                        }}
                        title="View Profile"
                      >
                        <i className="bi bi-person"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleProviderSuggestionClick(provider)}
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
                        className="btn btn-sm btn-outline-warning me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          calculateRoute(provider);
                        }}
                        title="Show Route"
                      >
                        <i className="bi bi-signpost-2"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-success me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chatbox?providerId=${provider.id}`);
                        }}
                        title="Send Message"
                      >
                        <i className="bi bi-envelope"></i>
                      </button>

                      <button 
                        className={`btn btn-sm ${favoriteStatuses[provider.id] ? 'btn-danger' : 'btn-outline-danger'} ${loadingFavorites[provider.id] ? 'heart-loading' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(provider);
                        }}
                        title={favoriteStatuses[provider.id] ? 'Remove from Favorites' : 'Add to Favorites'}
                        disabled={loadingFavorites[provider.id]}
                        style={{
                          transition: 'all 0.2s ease-in-out',
                          transform: favoriteStatuses[provider.id] ? 'scale(1.1)' : 'scale(1)'
                        }}
                      >
                        <i className={`bi ${favoriteStatuses[provider.id] ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                        {loadingFavorites[provider.id] ? ' ⏳' : favoriteStatuses[provider.id] ? ' ❤️' : ' 🤍'}
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
            
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">My Favorite Providers</h5>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => loadUserFavorites()}
                title="Refresh Favorites"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            <div className="favorites-list">
              {favorites.length > 0 ? (
                favorites.map((favorite, index) => (
                  <div key={favorite._id || index} className="favorite-item">
                    <div className="favorite-info">
                      <strong>{favorite.serviceProvider.name}</strong>
                      <br />
                      <small className="text-muted">{favorite.serviceProvider.occupation}</small>
                      <div className="provider-rating-charge">
                        <small className="text-warning me-2">
                          <i className="bi bi-star-fill"></i> {favorite.serviceProvider.averageRating || 'N/A'}
                        </small>
                        {favorite.serviceProvider.charge && (
                          <small className="text-success">
                            <i className="bi bi-currency-dollar"></i> ৳{favorite.serviceProvider.charge}
                          </small>
                        )}
                      </div>
                      <br />
                      <small className="text-muted">Added: {new Date(favorite.addedAt || favorite.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div className="favorite-actions">
                      <button 
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProfileCard(favorite.serviceProvider);
                        }}
                        title="View Profile"
                      >
                        <i className="bi bi-person"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleProviderSuggestionClick(favorite.serviceProvider)}
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
                        className="btn btn-sm btn-outline-warning me-2"
                        onClick={() => calculateRoute(favorite.serviceProvider)}
                        title="Show Route"
                      >
                        <i className="bi bi-signpost-2"></i>
                      </button>

                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => toggleFavorite(favorite.serviceProvider)}
                        title="Remove from Favorites"
                      >
                        <i className="bi bi-heart-fill"></i>
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
          </div> {/* End sidebar-content */}
          
          {/* Route Information Section */}
          {routeData && (
            <>
              <hr className="my-4" />
              <div className="route-info-section">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-signpost-2 text-warning me-2"></i>
                    Route to {routeData.provider.name}
                    {routeData.isEstimated ? (
                      <span className="badge bg-warning text-dark ms-2">Simulated</span>
                    ) : (
                      <span className="badge bg-success text-white ms-2">Real Route</span>
                    )}
                  </h5>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearRoute}
                    title="Clear Route"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                
                <div className="route-details">
                  <div className="distance-info mb-3">
                    <div className="distance-badge mb-2">
                      <i className="bi bi-arrow-right-circle me-2"></i>
                      {routeData.distance} km
                    </div>
                    <div className="estimated-time">
                      <i className="bi bi-clock me-1"></i>
                      Estimated time: {routeData.duration} minutes
                      {routeData.isEstimated && (
                        <span className="text-muted ms-1">(approximate)</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="provider-route-info">
                    <p className="mb-1">
                      <strong>From:</strong> Your Location
                    </p>
                    <p className="mb-1">
                      <strong>To:</strong> {routeData.provider.name} ({routeData.provider.occupation})
                    </p>
                    <p className="mb-0">
                      <strong>Address:</strong> {routeData.provider.address || 'Location coordinates available'}
                    </p>
                  </div>
                  
                  {routeData.isEstimated && (
                    <div className="alert alert-warning mt-3 mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      <small>
                        This is a road simulation. For exact street routing, please try again later when routing services are available.
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Route Error Display */}
          {routeError && (
            <>
              <hr className="my-4" />
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Route Error:</strong> {routeError}
                <button 
                  className="btn btn-sm btn-outline-danger ms-2"
                  onClick={() => setRouteError(null)}
                >
                  Dismiss
                </button>
              </div>
            </>
          )}

          {/* Route Loading State */}
          {isCalculatingRoute && (
            <>
              <hr className="my-4" />
              <div className="text-center p-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 mb-0">Calculating route...</p>
              </div>
            </>
          )}
        </div> {/* End sidebar */}

          {/* Map Area */}
          <div 
            className="map-area"
            style={{ width: isSidebarCollapsed ? 'calc(100% - 50px)' : `calc(100% - ${sidebarWidth}%)` }}
            ref={mapAreaRef}
          >
            {/* Floating draggable/collapsible search */}
            <div
              ref={floatingSearchRef}
              className={`floating-search ${isSearchExpanded ? 'expanded' : ''}`}
              style={{ left: floatingSearchPos.x, top: floatingSearchPos.y }}
            >
              <div
                className="search-drag-handle"
                title="Drag"
                onMouseDown={handleFloatingSearchMouseDown}
              />
              <button
                className="search-toggle"
                type="button"
                title={isSearchExpanded ? 'Close search' : 'Open search'}
                onClick={() => setIsSearchExpanded((v) => !v)}
              >
                <i className="bi bi-search"></i>
              </button>
              <input
                className="search-input"
                type="text"
                placeholder="Search occupation..."
                value={floatingSearchQuery}
                onChange={(e) => { setFloatingSearchQuery(e.target.value); updateFloatingSuggestions(e.target.value); }}
                onFocus={() => { if (floatingSuggestions.length > 0) setShowFloatingSuggestions(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter') executeFloatingSearch(); }}
              />
              <button
                className="search-send"
                type="button"
                title="Search"
                onClick={() => executeFloatingSearch()}
              >
                <i className="bi bi-send"></i>
              </button>

              {/* Suggestions dropdown */}
              {isSearchExpanded && showFloatingSuggestions && floatingSuggestions.length > 0 && (
                <div className="floating-search-suggestions">
                  {floatingSuggestions.map((s, idx) => (
                    <div
                      key={`${s}-${idx}`}
                      className="floating-suggestion-item"
                      onClick={() => { setFloatingSearchQuery(s); executeFloatingSearch(s); }}
                    >
                      <i className="bi bi-briefcase me-2"></i>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <MapContainer
              center={[51.505, -0.09]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png" 
              />
              
              {markers.map((marker) => (
                <Marker key={marker.id} position={marker.position} icon={createCustomMarkerIcon(marker)} />
              ))}
              
              {/* User location marker */}
              {showUserMarker && user && user.latitude && user.longitude && (
                <Marker 
                  key="user-location"
                  position={[user.latitude, user.longitude]}
                  icon={L.divIcon({
                    className: 'user-location-marker',
                    html: `
                      <div class="user-marker-info">
                        <div class="user-marker-header">
                          <h6 class="user-marker-name">My Location</h6>
                          <div class="user-marker-icon">
                            <i class="bi bi-house-fill"></i>
                          </div>
                        </div>
                        <div class="user-marker-body">
                          <p class="user-marker-address">
                            <i class="bi bi-geo-alt me-1"></i>
                            Your registered location
                          </p>
                        </div>
                      </div>
                    `,
                    iconSize: [160, 90],
                    iconAnchor: [80, 90],
                    popupAnchor: [0, -90]
                  })}
                />
              )}

              {/* Route polyline */}
              {routePolyline && (
                <Polyline
                  positions={routePolyline}
                  color="#007bff"
                  weight={4}
                  opacity={0.8}
                  dashArray="10, 5"
                />
              )}
              
                              <MapControls 
                  mapRef={mapRef} 
                  userLocation={user}
                  onGoHome={handleGoHome}
                />
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

      {/* Profile Card */}
      <ProfileCard
        provider={selectedProviderForProfile}
        isOpen={showProfileCard}
        onClose={closeProfileCard}
        onShowOnMap={handleProfileCardShowOnMap}
        onOpenReviews={handleProfileCardOpenReviews}
        onSendMessage={handleProfileCardSendMessage}
        onBookNow={() => {
          if (selectedProviderForProfile) {
            openBookingModal(selectedProviderForProfile);
            closeProfileCard();
          }
        }}
        onShowRoute={() => {
          if (selectedProviderForProfile) {
            calculateRoute(selectedProviderForProfile);
            closeProfileCard();
          }
        }}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={closeBookingModal}
        serviceProvider={selectedProviderForBooking}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Notification */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard; 