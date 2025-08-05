import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: formData.email,
        password: formData.password
      });

      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Show success message
      toast.success('Login successful!');

      // Redirect based on user type
      if (response.data.user.userType === 'admin') {
        navigate('/admin-dashboard');
      } else if (response.data.user.userType === 'service provider') {
        navigate('/service-provider-dashboard');
      } else {
        navigate('/user-dashboard');
      }

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('password')) {
        toast.error('Invalid email or password!');
      } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        toast.error('User not found! Please check your email.');
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
        maxWidth: '600px',
        height: 'auto',
        minHeight: '500px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#007bff', fontWeight: 'bold' }}>Login</h2>
                </div>

                <form onSubmit={handleSubmit}>
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

                  <div style={{ marginBottom: '25px' }}>
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
                      {loading ? 'Logging in...' : 'Login'}
                    </button>
                  </div>
                </form>

                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0', color: '#666' }}>
                    Not yet registered? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none' }}>Sign up</Link>
                  </p>
                </div>
        </div>
      </div>
    </div>
  );
};

export default Login;