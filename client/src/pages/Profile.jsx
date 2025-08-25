import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import '../styles/Auth.css';
import Navbar from './navbar';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    longitude: '',
    latitude: ''
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
      latitude: userInfo.latitude || ''
    });
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (!formData.longitude || !formData.latitude) {
      toast.error('Longitude and Latitude are required for all users');
      return false;
    }
    if (isNaN(formData.longitude) || isNaN(formData.latitude)) {
      toast.error('Longitude and Latitude must be valid numbers');
      return false;
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

      toast.success('Profile updated successfully!');
      
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

                  <hr className="my-4" />
                  <h5 className="mb-3">Location Information</h5>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="latitude" className="form-label">Latitude *</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        id="latitude"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        placeholder="Enter latitude"
                        required
                      />
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="longitude" className="form-label">Longitude *</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        id="longitude"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        placeholder="Enter longitude"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Note:</strong> Your location coordinates are required for all users and help with location-based services.
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
    </div>
  );
};

export default Profile;
