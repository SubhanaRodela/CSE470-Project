import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: '',
    occupation: '',
    longitude: '',
    latitude: '',
    charge: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const occupations = [
    'Plumber',
    'Electrician',
    'Painter',
    'Carpenter',
    'AC/Fridge/Washer Repair Technician',
    'Cleaner',
    'Mechanic',
    'Bike Repairer',
    'General Handyman',
    'Internet Technician',
    'Pest Controller'
  ];

  const userTypes = ['user', 'service provider', 'admin'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear occupation and charge when user type changes to non-service provider
    if (name === 'userType' && value !== 'service provider') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        occupation: '',
        charge: ''
      }));
    }

    // Real-time password matching validation
    if (name === 'confirmPassword' && formData.password && value !== formData.password) {
      toast.error('Passwords do not match!', { id: 'password-match' });
    } else if (name === 'confirmPassword' && formData.password && value === formData.password) {
      toast.success('Passwords match!', { id: 'password-match' });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.userType) {
      toast.error('Please select a user type');
      setLoading(false);
      return;
    }

    // Validate location coordinates for all users
    if (!formData.longitude || !formData.latitude) {
      toast.error('Please enter your location coordinates');
      setLoading(false);
      return;
    }

    if (formData.userType === 'service provider') {
      if (!formData.occupation) {
        toast.error('Please select an occupation for service provider');
        setLoading(false);
        return;
      }
      if (!formData.charge || parseFloat(formData.charge) < 0) {
        toast.error('Please enter a valid service charge (must be 0 or greater)');
        setLoading(false);
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const requestData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        userType: formData.userType,
        password: formData.password,
        longitude: parseFloat(formData.longitude),
        latitude: parseFloat(formData.latitude)
      };

      // Only include service provider specific fields if user type is service provider
      if (formData.userType === 'service provider') {
        requestData.occupation = formData.occupation;
        requestData.charge = parseFloat(formData.charge);
      }



      const response = await axios.post('http://localhost:5000/api/auth/register', requestData);

      // Show success message and redirect to login
      toast.success('Registration successful! Please login with your credentials.');
      navigate('/login');

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        toast.error('User already exists with this email!');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ 
      width: '100%', 
      minHeight: '100vh', 
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '700px',
        height: 'auto',
        minHeight: '600px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#007bff', fontWeight: 'bold' }}>Register</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="name" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  height: '45px',
                  padding: '10px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: 'white',
                  color: '#333'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="email" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  height: '45px',
                  padding: '10px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: 'white',
                  color: '#333'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="phone" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  height: '45px',
                  padding: '10px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: 'white',
                  color: '#333'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="userType" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                User Type *
              </label>
              <select
                id="userType"
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  height: '45px',
                  padding: '10px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  backgroundColor: 'white',
                  color: '#333'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              >
                <option value="">Select User Type</option>
                {userTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

                        {/* Location Coordinates for all users */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Location Coordinates *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="longitude" style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Longitude
                  </label>
                  <input
                    type="number"
                    id="longitude"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    step="0.0001"
                    placeholder="-74.0060"
                    required
                    style={{
                      width: '100%',
                      height: '45px',
                      padding: '10px 15px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="latitude" style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Latitude
                  </label>
                  <input
                    type="number"
                    id="latitude"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    step="0.0001"
                    placeholder="40.7128"
                    required
                    style={{
                      width: '100%',
                      height: '45px',
                      padding: '10px 15px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                </div>
              </div>
              <small style={{ color: '#666', fontSize: '12px' }}>
                Enter your location coordinates (e.g., -74.0060, 40.7128 for New York)
              </small>
            </div>

            {formData.userType === 'service provider' && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="occupation" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Occupation *
                  </label>
                  <select
                    id="occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      height: '45px',
                      padding: '10px 15px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  >
                    <option value="">Select Occupation</option>
                    {occupations.map(occupation => (
                      <option key={occupation} value={occupation}>
                        {occupation}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="charge" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Service Charge (Taka) *
                  </label>
                  <input
                    type="number"
                    id="charge"
                    name="charge"
                    value={formData.charge}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                    style={{
                      width: '100%',
                      height: '45px',
                      padding: '10px 15px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Enter your base service charge in Taka (minimum ৳0.00)
                  </small>
                </div>
              </>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="password" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    height: '45px',
                    padding: '10px 50px 10px 15px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    backgroundColor: 'white',
                    color: '#333'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '18px'
                  }}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label htmlFor="confirmPassword" style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#333'
              }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    height: '45px',
                    padding: '10px 50px 10px 15px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    backgroundColor: 'white',
                    color: '#333'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '18px'
                  }}
                >
                  <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  height: '50px',
                  backgroundColor: loading ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#0056b3';
                }}
                onMouseOut={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#007bff';
                }}
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0', color: '#666' }}>
              Already registered? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;