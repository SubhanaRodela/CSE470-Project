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
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        height: 'auto',
        minHeight: '500px',
        backgroundColor: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(124, 58, 237, 0.15)',
        border: '1px solid #e9d5ff'
      }}>
        <div style={{ padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#7c3aed', fontWeight: '800', letterSpacing: '0.2px' }}>Login</h2>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="email" style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: '#4b5563'
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
                        height: '48px',
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        backgroundColor: 'white',
                        color: '#111827'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.15)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <div style={{ marginBottom: '25px' }}>
                    <label htmlFor="password" style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: '#4b5563'
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
                          height: '48px',
                          padding: '12px 48px 12px 16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '16px',
                          outline: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                          backgroundColor: 'white',
                          color: '#111827'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.15)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
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
                        background: loading ? '#9ca3af' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '17px',
                        fontWeight: '700',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.1s ease, box-shadow 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!loading) e.target.style.boxShadow = '0 12px 24px rgba(124, 58, 237, 0.25)';
                      }}
                      onMouseOut={(e) => {
                        if (!loading) e.target.style.boxShadow = 'none';
                      }}
                      onMouseDown={(e) => {
                        if (!loading) e.target.style.transform = 'scale(0.98)';
                      }}
                      onMouseUp={(e) => {
                        if (!loading) e.target.style.transform = 'scale(1)';
                      }}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </button>
                  </div>
                </form>

                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0', color: '#6b7280' }}>
                    Not yet registered? <Link to="/register" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
                  </p>
                </div>
        </div>
      </div>
    </div>
  );
};

export default Login;