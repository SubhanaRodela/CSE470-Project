import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Auth.css';
import '../styles/Map.css';
import Navbar from './navbar';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Draggable marker component
const DraggableMarker = ({ position, onPositionChange }) => {
  const map = useMap();
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend: () => {
      const marker = markerRef.current;
      if (marker) {
        const newPosition = marker.getLatLng();
        onPositionChange([newPosition.lat, newPosition.lng]);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={L.divIcon({
        className: 'location-picker-marker',
        html: `
          <div class="marker-content">
            <i class="bi bi-geo-alt-fill"></i>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      })}
    />
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState([0, 0]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    longitude: '',
    latitude: '',
    address: '',
    charge: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    const userInfo = JSON.parse(userData);
    setUser(userInfo);
    
    // Pre-fill form with existing user data
    setFormData({
      name: userInfo.name || '',
      phone: userInfo.phone || '',
      email: userInfo.email || '',
      password: '',
      confirmPassword: '',
      longitude: userInfo.longitude || '',
      latitude: userInfo.latitude || '',
      address: userInfo.address || '',
      charge: userInfo.charge || ''
    });

    // Set initial map location to user's current coordinates or default
    if (userInfo.latitude && userInfo.longitude) {
      setSelectedLocation([userInfo.latitude, userInfo.longitude]);
    } else {
      // Default to a central location (e.g., Dhaka, Bangladesh)
      setSelectedLocation([23.8103, 90.4125]);
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openMapModal = () => {
    setShowMapModal(true);
  };

  const closeMapModal = () => {
    setShowMapModal(false);
  };

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setSelectedLocation([lat, lng]);
    
    // Automatically get address from coordinates
    const address = await getAddressFromCoordinates(lat, lng);
    if (address) {
      setFormData(prev => ({
        ...prev,
        address: address
      }));
    }
  };

  // Reverse geocoding function to get address from coordinates
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        return data.display_name;
      }
      return null;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return null;
    }
  };

  const setLocationFromMap = async () => {
    const [lat, lng] = selectedLocation;
    
    // Get address from coordinates
    const address = await getAddressFromCoordinates(lat, lng);
    
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      address: address || ''
    }));
    
    closeMapModal();
    
    if (address) {
      toast.success(`Location set: ${address}`);
    } else {
      toast.success('Location coordinates set from map!');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    
    // Validate charge for service providers
    if (user?.userType === 'service provider' && formData.charge) {
      const chargeValue = parseFloat(formData.charge);
      if (isNaN(chargeValue) || chargeValue < 0) {
        toast.error('Base service price must be a positive number');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email
      };

      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      // Include location data for all users
      updateData.longitude = parseFloat(formData.longitude);
      updateData.latitude = parseFloat(formData.latitude);
      updateData.address = formData.address; // Add address to update data

      // Include charge for service providers
      if (user.userType === 'service provider' && formData.charge) {
        updateData.charge = parseFloat(formData.charge);
      }

      console.log('Sending update data:', updateData);
      console.log('Token:', token);
      
      const response = await axios.put(
        'http://localhost:5000/api/auth/update-profile',
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update local storage with new user data
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Show success message with charge update info if applicable
      if (user.userType === 'service provider' && formData.charge) {
        toast.success(`Profile updated successfully! Base price updated to ৳${formData.charge}`);
      } else {
        toast.success('Profile updated successfully!');
      }
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));

    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (user?.userType === 'service provider') {
      navigate('/service-provider-dashboard');
    } else if (user?.userType === 'user') {
      navigate('/user-dashboard');
    } else {
      navigate('/admin-dashboard');
    }
  };

  if (!user) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Navbar />
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="auth-title">Edit Profile</h2>
                  <p className="text-muted">Update your profile information</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="phone" className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">New Password (leave blank to keep current)</label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm new password"
                    />
                  </div>

                  {/* Base Price Field for Service Providers */}
                  {user?.userType === 'service provider' && (
                    <div className="mb-3">
                      <label htmlFor="charge" className="form-label">Base Service Price (BDT)</label>
                      <div className="input-group">
                        <span className="input-group-text">৳</span>
                        <input
                          type="number"
                          className="form-control"
                          id="charge"
                          name="charge"
                          value={formData.charge}
                          onChange={handleInputChange}
                          placeholder="Enter your base service price"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="form-text">
                        This is the base price for your services. You can adjust this for specific jobs.
                      </div>
                    </div>
                  )}

                  <hr className="my-4" />
                  <h5 className="mb-3">Location Information</h5>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="latitude" className="form-label">Latitude (Optional)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        id="latitude"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        placeholder="Enter latitude (optional)"
                      />
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="longitude" className="form-label">Longitude (Optional)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        id="longitude"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        placeholder="Enter longitude (optional)"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="address" className="form-label">Address (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address (optional)"
                    />
                  </div>

                  <div className="d-grid gap-2 mb-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={openMapModal}
                    >
                      <i className="bi bi-map me-2"></i>
                      Set from Map
                    </button>
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Note:</strong> Location coordinates are optional but recommended for location-based services. You can set them using the map below or enter manually.
                  </div>

                  <div className="d-grid gap-2 mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                    
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleBack}
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div className="map-modal-overlay">
          <div className="map-modal">
            <div className="map-modal-header">
              <h5 className="mb-0">Select Your Location</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeMapModal}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="map-modal-body">
              <MapContainer
                center={selectedLocation}
                zoom={13}
                style={{ height: '400px', width: '100%' }}
                onClick={handleMapClick}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png"
                />
                <DraggableMarker
                  position={selectedLocation}
                  onPositionChange={setSelectedLocation}
                />
              </MapContainer>
              
              <div className="map-instructions mt-3">
                <p className="mb-2">
                  <i className="bi bi-info-circle me-2"></i>
                  Click anywhere on the map or drag the marker to set your location. The address will be automatically filled based on the selected coordinates.
                </p>
                <div className="coordinates-display">
                  <strong>Selected Location:</strong> {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                </div>
                {formData.address && (
                  <div className="address-display mt-2">
                    <strong>Address:</strong> {formData.address}
                  </div>
                )}
              </div>
            </div>
            
            <div className="map-modal-footer">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={closeMapModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={setLocationFromMap}
              >
                Set Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
