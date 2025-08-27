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
import FavoritesModal from '../components/FavoritesModal';
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
         ${marker.charge ? `
           <div class="marker-price-row">
             <small class="marker-price-label">Base fare</small>
             <span class="marker-price">${marker.charge} bdt</span>
           </div>
         ` : ''}
         <p class="marker-occupation">
           <span class="occ-left">
             <i class="bi bi-briefcase me-1"></i>
             ${marker.occupation || 'N/A'}
           </span>
         </p>
         ${marker.discount && marker.discount > 0 ? `
           <div class="marker-discount">
             <i class="bi bi-tag-fill"></i>
             <span>${marker.discount}% OFF</span>
           </div>
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
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  
  // Search results states
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'distance'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  
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
            const sp = favorite.serviceProvider;
            if (sp) {
              const normalizedId = sp.id || sp._id;
              if (normalizedId) {
                const ratingData = await fetchProviderRating(normalizedId);
                return {
                  ...favorite,
                  serviceProvider: {
                    ...sp,
                    id: normalizedId,
                    averageRating: ratingData.averageRating,
                    totalReviews: ratingData.totalReviews
                  }
                };
              }
            }
            return favorite;
          })
        );
        
        setFavorites(favoritesWithRatings);
        
        // Create a map of favorite statuses for quick lookup
        const statusMap = {};
        favoritesWithRatings.forEach(fav => {
          const sp = fav.serviceProvider;
          const key = sp && (sp.id || sp._id);
          if (key) statusMap[key] = true;
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
    let providerId = provider && (provider.id || provider._id);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Prevent multiple clicks
      if (!providerId) return;
      if (loadingFavorites[providerId]) {
        return;
      }

      // Set loading state
      setLoadingFavorites(prev => ({
        ...prev,
        [providerId]: true
      }));

      const isCurrentlyFavorite = !!favoriteStatuses[providerId];
      
      // Optimistically update UI for better UX
      if (isCurrentlyFavorite) {
        // Optimistically remove from UI
        setFavoriteStatuses(prev => ({
          ...prev,
          [providerId]: false
        }));
        setFavorites(prev => prev.filter(fav => {
          if (!fav || !fav.serviceProvider) return true;
          const favId = fav.serviceProvider.id || fav.serviceProvider._id;
          return favId !== providerId;
        }));
      } else {
        // Optimistically add to UI
        setFavoriteStatuses(prev => ({
          ...prev,
          [providerId]: true
        }));
        // Create a temporary favorite object for immediate display
        const tempFavorite = {
          _id: Date.now(), // temporary ID
          user: user.id,
          serviceProvider: { ...provider, id: providerId },
          createdAt: new Date().toISOString(),
          addedAt: new Date().toISOString()
        };
        setFavorites(prev => [...prev, tempFavorite]);
      }
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const response = await fetch(`http://localhost:5000/api/favorites/${providerId}`, {
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
            [providerId]: true
          }));
          // Reload favorites to get correct state
          await loadUserFavorites();
          showNotification(`Failed to remove from favorites: ${data.message}`, 'error');
        }
      } else {
        // Add to favorites
        const tempId = `temp-${providerId}-${Date.now()}`;
        const response = await fetch('http://localhost:5000/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            serviceProviderId: providerId
          })
        });

        const data = await response.json();
        
        if (data.success) {
          showNotification(`${provider.name} added to favorites`, 'success');
          // Replace temporary favorite with real one
          setFavorites(prev => prev.map(fav => (fav && fav._id === tempId) ? data.favorite : fav));
        } else {
          console.error('❌ Failed to add to favorites:', data.message);
          // Revert optimistic update
          setFavoriteStatuses(prev => ({
            ...prev,
            [providerId]: false
          }));
          setFavorites(prev => prev.filter(fav => fav && fav._id !== tempId));
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
        [providerId]: false
      }));
    }
  };


  // Search providers by address keywords and plot markers
  const searchProvidersByAddress = async (rawQuery) => {
    const query = (rawQuery || '').trim();
    if (query.length < 2) return;
    try {
      const resp = await fetch(`http://localhost:5000/api/auth/search-service-providers?query=${encodeURIComponent(query)}`);
      const data = await resp.json();
      const matches = data.serviceProviders || [];

      if (matches.length === 0) {
        showNotification('No providers matched this address search', 'info');
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      const newMarkers = await Promise.all(matches.map(async (provider) => {
        const ratingData = await fetchProviderRating(provider.id);
        
        // Fetch discount information for the provider
        let discount = 0;
        try {
          const discountResp = await fetch(`http://localhost:5000/api/qpay/account`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (discountResp.ok) {
            const discountData = await discountResp.json();
            discount = discountData.data?.discount || 0;
          }
        } catch (error) {
          console.error('Error fetching discount for provider:', provider.id, error);
        }
        
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
          totalReviews: ratingData.totalReviews,
          discount: discount
        };
      }));

      setMarkers(newMarkers);
      
      // Prepare search results with distance calculations for sidebar
      const resultsWithDistance = matches.map(provider => {
        const ratingData = newMarkers.find(m => m.providerId === provider.id);
        const distanceFromUser = user && user.latitude && user.longitude 
          ? calculateDistance(user.latitude, user.longitude, provider.latitude, provider.longitude)
          : null;
        
        return {
          ...provider,
          averageRating: ratingData?.averageRating || 'N/A',
          totalReviews: ratingData?.totalReviews || 0,
          distanceFromUser: distanceFromUser ? parseFloat(distanceFromUser.toFixed(1)) : null,
          discount: ratingData?.discount || 0
        };
      });
      
      setSearchResults(resultsWithDistance);
      setShowSearchResults(true);
      
      if (newMarkers.length > 1) {
        const bounds = newMarkers.reduce((b, m) => { b.extend(m.position); return b; }, L.latLngBounds());
        if (mapRef.current) mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      } else if (newMarkers.length === 1 && mapRef.current) {
        mapRef.current.setView(newMarkers[0].position, 15);
      }

      showNotification(`Found ${newMarkers.length} provider(s) by address`, 'success');
    } catch (err) {
      console.error('Error address searching providers:', err);
      showNotification('Address search failed', 'error');
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
        
        // Prepare search results with distance calculations
        const resultsWithDistance = data.serviceProviders.map(provider => {
          const ratingData = newMarkers.find(m => m.providerId === provider.id);
          const distanceFromUser = user && user.latitude && user.longitude 
            ? calculateDistance(user.latitude, user.longitude, provider.latitude, provider.longitude)
            : null;
          
          return {
            ...provider,
            averageRating: ratingData?.averageRating || 'N/A',
            totalReviews: ratingData?.totalReviews || 0,
            distanceFromUser: distanceFromUser ? parseFloat(distanceFromUser.toFixed(1)) : null
          };
        });
        
        setSearchResults(resultsWithDistance);
        setShowSearchResults(true);
        
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
        setSearchResults([]);
        setShowSearchResults(false);
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

    // Always show user marker when calculating route
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

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sort search results based on current sort criteria
  const getSortedResults = () => {
    if (!searchResults.length) return [];
    
    return [...searchResults].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = parseFloat(a.charge) || 0;
          bValue = parseFloat(b.charge) || 0;
          break;
        case 'distance':
          aValue = a.distanceFromUser || 0;
          bValue = b.distanceFromUser || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
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

  // Add sidebar resize event listeners
  useEffect(() => {
    const handleMouseMove = (e) => handleResizeMove(e);
    const handleMouseUp = () => handleResizeEnd();
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
    
    // Check if query looks like a location (contains common location words)
    const locationKeywords = ['road', 'street', 'avenue', 'lane', 'drive', 'place', 'close', 'way', 'crescent', 'circle', 'square', 'park', 'area', 'district', 'city', 'town', 'village', 'upazila', 'thana', 'dhaka', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barisal', 'rangpur', 'mymensingh'];
    const isLocationQuery = locationKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (isLocationQuery) {
      // For location queries, show location suggestions
      setFloatingSuggestions([`📍 Search "${query}" for service providers`]);
      setShowFloatingSuggestions(true);
    } else {
      // For occupation queries, show occupation suggestions
      const uniques = getUniqueOccupations();
      const filtered = uniques
        .filter(o => o && o.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);
      setFloatingSuggestions(filtered);
      setShowFloatingSuggestions(filtered.length > 0);
    }
  };

  const executeFloatingSearch = (term) => {
    const q = (term ?? floatingSearchQuery).trim();
    if (q.length >= 2) {
      // Check if query looks like a location
      const locationKeywords = ['road', 'street', 'avenue', 'lane', 'drive', 'place', 'close', 'way', 'crescent', 'circle', 'square', 'park', 'area', 'district', 'city', 'town', 'village', 'upazila', 'thana', 'dhaka', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barisal', 'rangpur', 'mymensingh'];
      const isLocationQuery = locationKeywords.some(keyword => 
        q.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isLocationQuery) {
        // Execute location search
        searchProvidersByAddress(q);
        setShowFloatingSuggestions(false);
      } else {
        // Execute occupation search
        searchByOccupation(q);
        setShowFloatingSuggestions(false);
      }
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
    console.log('Toggling sidebar:', { current: isSidebarCollapsed, new: newCollapsedState });
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
            {/* Top spacing for collapsible button */}
            <div className="sidebar-top-spacing"></div>
            
            <button 
              className="sidebar-wide-button favourite-list-button"
              onClick={() => setShowFavoritesModal(true)}
              type="button"
              title="Open Favourite Providers"
            >
              <i className="bi bi-heart me-2"></i>
              Favourite List
            </button>

            {/* Quick Links Section */}
            <div className="quick-links-section">
              <h5 className="quick-links-title">
                <i className="bi bi-lightning me-2"></i>
                Quick Links
              </h5>
              <div className="quick-links-grid">
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Plumber')}
                  type="button"
                  title="Find Plumbers"
                >
                  <i className="bi bi-tools"></i>
                  <span>Plumber</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Electrician')}
                  type="button"
                  title="Find Electricians"
                >
                  <i className="bi bi-lightning-charge"></i>
                  <span>Electrician</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Painter')}
                  type="button"
                  title="Find Painters"
                >
                  <i className="bi bi-palette"></i>
                  <span>Painter</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Carpenter')}
                  type="button"
                  title="Find Carpenters"
                >
                  <i className="bi bi-hammer"></i>
                  <span>Carpenter</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Technician')}
                  type="button"
                  title="Find Technicians"
                >
                  <i className="bi bi-gear"></i>
                  <span>Technician</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Cleaner')}
                  type="button"
                  title="Find Cleaners"
                >
                  <i className="bi bi-brush"></i>
                  <span>Cleaner</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Pest Controller')}
                  type="button"
                  title="Find Pest Controllers"
                >
                  <i className="bi bi-shield-check"></i>
                  <span>Pest Controller</span>
                </button>
                
                <button 
                  className="quick-link-btn"
                  onClick={() => searchByOccupation('Bike Repairer')}
                  type="button"
                  title="Find Bike Repairers"
                >
                  <i className="bi bi-bicycle"></i>
                  <span>Bike Repairer</span>
                </button>
              </div>
            </div>

            {/* Search Results Section */}
            {showSearchResults && searchResults.length > 0 && (
              <>
                <div className="search-results-section">
                  <div className="search-results-header">
                    <h5 className="mb-3">
                      <i className="bi bi-search me-2"></i>
                      Search Results ({searchResults.length})
                    </h5>
                    
                    {/* Sort Controls */}
                    <div className="sort-controls mb-3">
                      <div className="sort-row">
                        <label className="sort-label">Sort by:</label>
                        <select 
                          className="sort-select"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                        >
                          <option value="name">Name</option>
                          <option value="price">Base fare</option>
                          <option value="distance">Distance</option>
                        </select>
                      </div>
                      <div className="sort-row">
                        <label className="sort-label">Order:</label>
                        <select 
                          className="order-select"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                        >
                          <option value="asc">Low to High</option>
                          <option value="desc">High to Low</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Results List */}
                  <div className="search-results-list">
                    {getSortedResults().map((provider, index) => (
                      <div key={provider.id} className="search-result-item">
                        <div className="result-main-info">
                          <div className="result-name">{provider.name}</div>
                          <div className="result-occupation">{provider.occupation}</div>
                        </div>
                        <div className="result-details">
                          <div className="result-rating">
                            <i className="bi bi-star-fill text-warning"></i>
                            <span>{provider.averageRating}</span>
                            <small className="text-muted">({provider.totalReviews})</small>
                          </div>
                          <div className="result-price">{provider.charge} bdt</div>
                          {provider.distanceFromUser && (
                            <div className="result-distance">
                              <i className="bi bi-geo-alt"></i>
                              {provider.distanceFromUser} km
                            </div>
                          )}
                        </div>
                        <div className="result-actions">
                          <button
                            className="result-action-btn"
                            onClick={() => openProfileCard(provider)}
                            title="View Profile"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className="result-action-btn"
                            onClick={() => handleProviderSuggestionClick(provider)}
                            title="Show on Map"
                          >
                            <i className="bi bi-map"></i>
                          </button>
                          <button
                            className="result-action-btn"
                            onClick={() => {
                              setShowUserMarker(true);
                              calculateRoute(provider);
                            }}
                            title="Get Route"
                          >
                            <i className="bi bi-signpost-2"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Clear Results Button */}
                  <button
                    className="sidebar-wide-button clear-results-button"
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchResults([]);
                    }}
                    type="button"
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Clear Results
                  </button>
                </div>
              </>
            )}

          </div> {/* End sidebar-content */}
          


          {/* Route Error Display */}
          {routeError && (
            <>
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
              <div className="text-center p-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 mb-0">Calculating route...</p>
              </div>
            </>
          )}
        </div> {/* End sidebar */}

        {/* Route Information Panel - Right of Sidebar */}
        {routeData && (
          <div className="route-panel">
            <div className="route-panel-header">
              <h5 className="mb-0">
                <i className="bi bi-signpost-2 text-warning me-2"></i>
                Route to {routeData.provider.name}
                {routeData.isEstimated && (
                  <span className="badge bg-warning text-dark ms-2">Simulated</span>
                )}
              </h5>
              <button 
                className="route-panel-close"
                onClick={clearRoute}
                title="Clear Route"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            
            <div className="route-panel-content">
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
              
              <div className="route-details-card">
                <div className="route-detail-item">
                  <div className="detail-icon">
                    <i className="bi bi-arrow-right"></i>
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Route</div>
                    <div className="detail-value">
                      <span className="route-from">Home</span>
                      <i className="bi bi-arrow-right mx-2"></i>
                      <span className="route-to">{routeData.provider.name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="route-detail-item">
                  <div className="detail-icon">
                    <i className="bi bi-pin-map-fill"></i>
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Address</div>
                    <div className="detail-value">{routeData.provider.address || 'Location coordinates available'}</div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="route-action-buttons">
                <button 
                  className="route-action-btn reviews-btn"
                  onClick={() => {
                    openReviewModal(routeData.provider);
                    clearRoute();
                  }}
                  title="View Reviews"
                >
                  <i className="bi bi-star-fill"></i>
                  <span>Reviews</span>
                </button>
                
                <button 
                  className="route-action-btn message-btn"
                  onClick={() => {
                    navigate(`/chatbox?providerId=${routeData.provider.id}`);
                    clearRoute();
                  }}
                  title="Send Message"
                >
                  <i className="bi bi-chat-dots-fill"></i>
                  <span>Message</span>
                </button>
                
                <button 
                  className="route-action-btn booking-btn"
                  onClick={() => {
                    openBookingModal(routeData.provider);
                    clearRoute();
                  }}
                  title="Book Now"
                >
                  <i className="bi bi-calendar-check-fill"></i>
                  <span>Book Now</span>
                </button>
              </div>
              
              {routeData.isEstimated && (
                <div className="route-simulation-notice">
                  <i className="bi bi-info-circle me-2"></i>
                  <small>
                    This is a road simulation. For exact street routing, please try again later when routing services are available.
                  </small>
                </div>
              )}
            </div>
          </div>
        )}

          {/* Map Area */}
          <div 
            className="map-area"
            style={{ width: isSidebarCollapsed ? 'calc(100% - 50px)' : `calc(100% - ${sidebarWidth}%)` }}
            ref={mapAreaRef}
          >
            {/* Map Quick Links Overlay */}
            <div className="map-quick-links">
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Plumber')}
                type="button"
                title="Find Plumbers"
              >
                <i className="bi bi-tools"></i>
                <span>Plumber</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Electrician')}
                type="button"
                title="Find Electricians"
              >
                <i className="bi bi-lightning-charge"></i>
                <span>Electrician</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Painter')}
                type="button"
                title="Find Painters"
              >
                <i className="bi bi-palette"></i>
                <span>Painter</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Carpenter')}
                type="button"
                title="Find Carpenters"
              >
                <i className="bi bi-hammer"></i>
                <span>Carpenter</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Technician')}
                type="button"
                title="Find Technicians"
              >
                <i className="bi bi-gear"></i>
                <span>Technician</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Cleaner')}
                type="button"
                title="Find Cleaners"
              >
                <i className="bi bi-brush"></i>
                <span>Cleaner</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Pest Controller')}
                type="button"
                title="Find Pest Controllers"
              >
                <i className="bi bi-shield-check"></i>
                <span>Pest Controller</span>
              </button>
              
              <button 
                className="map-quick-link-btn"
                onClick={() => searchByOccupation('Bike Repairer')}
                type="button"
                title="Find Bike Repairers"
              >
                <i className="bi bi-bicycle"></i>
                <span>Bike Repairer</span>
              </button>
            </div>
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
                placeholder="Search occupation or location..."
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
                  {floatingSuggestions.map((s, idx) => {
                    // Check if this is a location suggestion
                    const isLocationSuggestion = s.startsWith('📍');
                    
                    return (
                      <div
                        key={`${s}-${idx}`}
                        className="floating-suggestion-item"
                        onClick={() => { 
                          if (isLocationSuggestion) {
                            // For location suggestions, extract the query and search
                            const query = s.replace('📍 Search "', '').replace('" for service providers', '');
                            setFloatingSearchQuery(query);
                            executeFloatingSearch(query);
                          } else {
                            // For occupation suggestions, use as is
                            setFloatingSearchQuery(s);
                            executeFloatingSearch(s);
                          }
                        }}
                      >
                        <i className={`bi ${isLocationSuggestion ? 'bi-geo-alt' : 'bi-briefcase'} me-2`}></i>
                        {isLocationSuggestion ? s.replace('📍 Search "', '').replace('" for service providers', '') : s}
                      </div>
                    );
                  })}
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
                <>
                  <Polyline
                    positions={routePolyline}
                    color="#667eea"
                    weight={6}
                    opacity={1}
                    className="route-polyline"
                    pathOptions={{
                      color: '#667eea',
                      weight: 6,
                      opacity: 1,
                      fillOpacity: 0.8,
                      dashArray: '0',
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                  
                  {/* Animated route progress indicator */}
                  <Polyline
                    positions={routePolyline}
                    color="#764ba2"
                    weight={6}
                    opacity={1}
                    className="route-progress"
                    pathOptions={{
                      color: '#764ba2',
                      weight: 6,
                      opacity: 1,
                      fillOpacity: 0.8,
                      dashArray: '0',
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                  

                  

                  

                </>
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
        onAddFavorite={() => {
          if (selectedProviderForProfile) {
            toggleFavorite(selectedProviderForProfile);
          }
        }}
        isFavorite={selectedProviderForProfile ? !!favoriteStatuses[selectedProviderForProfile.id] : false}
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

      {/* Favourites Modal */}
      <FavoritesModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        favorites={favorites}
        onOpenProfile={(provider) => { openProfileCard(provider); setShowFavoritesModal(false); }}
        onShowOnMap={(provider) => { handleProviderSuggestionClick(provider); setShowFavoritesModal(false); }}
        onRoute={(provider) => { calculateRoute(provider); setShowFavoritesModal(false); }}
        onMessage={(provider) => { navigate(`/chatbox?providerId=${provider.id}`); setShowFavoritesModal(false); }}
        onRemoveFavorite={(provider) => toggleFavorite(provider)}
      />
    </div>
  );
};

export default UserDashboard; 