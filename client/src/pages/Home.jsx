import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/Home.css';
import '../styles/Footer.css';
import Footer from '../components/Footer';

const Home = () => {
  const navigate = useNavigate();
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    const animationSequence = async () => {
      while (true) {
        // Stage 1: Builder appears and starts hammering
        setAnimationStage(1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stage 2: Builder hammers the wood
        setAnimationStage(2);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Stage 3: Wood transforms to QuickFix text
        setAnimationStage(3);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Stage 4: Builder moves left slightly
        setAnimationStage(4);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stage 5: Builder vanishes
        setAnimationStage(5);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Stage 6: Animation complete, show final state
        setAnimationStage(6);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reset to start the loop again
        setAnimationStage(0);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    animationSequence();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10 text-center">
                <h1 className="hero-title">
                  Welcome
                </h1>
                <h2 className="hero-title">
                  to
                </h2>
                
                {/* Animated Builder Scene */}
                <div className="builder-animation-container">
                  {/* Builder */}
                  {animationStage >= 1 && animationStage <= 5 && (
                    <div className={`builder ${animationStage === 4 ? 'moving-left' : ''} ${animationStage === 5 ? 'vanishing' : ''}`}>
                      <div className="builder-body">
                        <div className="builder-head">
                          <div className="builder-face">
                            <div className="builder-eyes">
                              <div className="eye left-eye"></div>
                              <div className="eye right-eye"></div>
                            </div>
                            <div className="builder-mouth"></div>
                          </div>
                          <div className="builder-hat"></div>
                        </div>
                        <div className="builder-torso"></div>
                        <div className="builder-arms">
                          <div className={`arm left-arm ${animationStage === 2 ? 'hammering' : ''}`}>
                            <div className="hand"></div>
                          </div>
                          <div className={`arm right-arm ${animationStage === 2 ? 'hammering' : ''}`}>
                            <div className="hand"></div>
                          </div>
                        </div>
                        <div className="builder-legs">
                          <div className="leg left-leg"></div>
                          <div className="leg right-leg"></div>
                        </div>
                      </div>
                      
                      {/* Hammer */}
                      <div className={`hammer ${animationStage === 2 ? 'hammering' : ''}`}>
                        <div className="hammer-handle"></div>
                        <div className="hammer-head"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Wood/Text Building Area */}
                  <div className="building-area">
                    {animationStage < 3 && (
                      <div className={`wood ${animationStage === 2 ? 'being-hammered' : ''}`}>
                        <div className="wood-grain"></div>
                        <div className="wood-grain"></div>
                        <div className="wood-grain"></div>
                      </div>
                    )}
                    
                    {animationStage >= 3 && (
                      <div className="quickfix-text-built">
                        <span className="letter q">Q</span>
                        <span className="letter u">u</span>
                        <span className="letter i">i</span>
                        <span className="letter c">c</span>
                        <span className="letter k">k</span>
                        <span className="letter f">F</span>
                        <span className="letter i2">i</span>
                        <span className="letter x">x</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Hammering Effects */}
                  {animationStage === 2 && (
                    <>
                      <div className="hammer-spark spark-1"></div>
                      <div className="hammer-spark spark-2"></div>
                      <div className="hammer-spark spark-3"></div>
                      <div className="hammer-spark spark-4"></div>
                      <div className="hammer-spark spark-5"></div>
                      <div className="hammer-dust"></div>
                      <div className="dust-particle dust-particle-1"></div>
                      <div className="dust-particle dust-particle-2"></div>
                      <div className="dust-particle dust-particle-3"></div>
                      <div className="dust-particle dust-particle-4"></div>
                      <div className="dust-particle dust-particle-5"></div>
                    </>
                  )}
                </div>
                
                <p className="hero-subtitle">
                  Your trusted platform for connecting with skilled service providers
                </p>
                <p className="hero-description">
                  Find reliable professionals for all your home and business needs. 
                  From plumbing to electrical work, we've got you covered.
                </p>
                <div className="hero-buttons">
                  <button 
                    className="btn btn-primary btn-lg hero-btn-primary"
                    onClick={() => navigate('/register')}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Get Started
                  </button>
                  <button 
                    className="btn btn-outline-light btn-lg hero-btn-secondary"
                    onClick={() => navigate('/login')}
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Image Background */}
      <section className="features-section">
        <div className="features-background">
          <div className="features-overlay"></div>
        </div>
        <div className="container position-relative">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h2 className="section-title text-white">Why Choose QuickFix?</h2>
              <p className="section-subtitle text-white">Experience the difference with our professional service platform</p>
            </div>
          </div>
          
          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-shield-check"></i>
                </div>
                <h3>Verified Professionals</h3>
                <p>All service providers are thoroughly vetted and verified for your safety and peace of mind.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-lightning-charge"></i>
                </div>
                <h3>Quick Response</h3>
                <p>Get connected with service providers in minutes, not hours. Fast and efficient service delivery.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-star"></i>
                </div>
                <h3>Quality Guaranteed</h3>
                <p>Top-rated professionals with excellent reviews ensure high-quality service every time.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-credit-card"></i>
                </div>
                <h3>Secure Payments</h3>
                <p>Safe and secure payment system with QPay integration for hassle-free transactions.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-geo-alt"></i>
                </div>
                <h3>Local Experts</h3>
                <p>Find service providers in your area with our location-based search and mapping system.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="bi bi-headset"></i>
                </div>
                <h3>24/7 Support</h3>
                <p>Round-the-clock customer support to help you with any questions or concerns.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section with Image Background */}
      <section className="services-preview">
        <div className="services-background">
          <div className="services-overlay"></div>
        </div>
        <div className="container position-relative">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h2 className="section-title text-white">Popular Services</h2>
              <p className="section-subtitle text-white">Discover the wide range of services available on our platform</p>
            </div>
          </div>
          
          <div className="row g-4">
            <div className="col-lg-3 col-md-6">
              <div className="service-card">
                <div className="service-icon">
                  <i className="bi bi-tools"></i>
                </div>
                <h4>Plumbing</h4>
                <p>Expert plumbing services for all your needs</p>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="service-card">
                <div className="service-icon">
                  <i className="bi bi-lightning"></i>
                </div>
                <h4>Electrical</h4>
                <p>Professional electrical work and repairs</p>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="service-card">
                <div className="service-icon">
                  <i className="bi bi-brush"></i>
                </div>
                <h4>Painting</h4>
                <p>Quality painting and decoration services</p>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="service-card">
                <div className="service-icon">
                  <i className="bi bi-hammer"></i>
                </div>
                <h4>Carpentry</h4>
                <p>Skilled carpentry and woodwork</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery Section */}
      <section className="image-gallery">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h2 className="section-title">Our Work in Action</h2>
              <p className="section-subtitle">See the quality of work our service providers deliver</p>
            </div>
          </div>
          
          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <div className="gallery-item">
                <img src="/src/assets/images/IMG-20250827-WA0001.jpg" alt="Service Work 1" className="gallery-image" />
                <div className="gallery-overlay">
                  <h4>Professional Service</h4>
                  <p>Quality workmanship guaranteed</p>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="gallery-item">
                <img src="/src/assets/images/IMG-20250827-WA0003.jpg" alt="Service Work 2" className="gallery-image" />
                <div className="gallery-overlay">
                  <h4>Expert Solutions</h4>
                  <p>Solving problems efficiently</p>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="gallery-item">
                <img src="/src/assets/images/IMG-20250827-WA0004.jpg" alt="Service Work 3" className="gallery-image" />
                <div className="gallery-overlay">
                  <h4>Reliable Service</h4>
                  <p>Trusted by thousands</p>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="gallery-item">
                <img src="/src/assets/images/IMG-20250827-WA0005.jpg" alt="Service Work 4" className="gallery-image" />
                <div className="gallery-overlay">
                  <h4>Quality Results</h4>
                  <p>Exceeding expectations</p>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="gallery-item">
                <img src="/src/assets/images/IMG-20250827-WA0006.jpg" alt="Service Work 5" className="gallery-image" />
                <div className="gallery-overlay">
                  <h4>Skilled Professionals</h4>
                  <p>Vetted and verified experts</p>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="gallery-item">
                <img src="/src/assets/images/IMG-20250827-WA0007.jpg" alt="Service Work 6" className="gallery-image" />
                <div className="gallery-overlay">
                  <h4>Customer Satisfaction</h4>
                  <p>Happy clients, great reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section with Image Background */}
      <section className="cta-section">
        <div className="cta-background">
          <div className="cta-overlay"></div>
        </div>
        <div className="container position-relative">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <h2 className="text-white">Ready to Get Started?</h2>
              <p className="text-white">Join thousands of satisfied customers who trust QuickFix for their service needs</p>
              <button 
                className="btn btn-primary btn-lg cta-btn"
                onClick={() => navigate('/register')}
              >
                <i className="bi bi-rocket me-2"></i>
                Start Your Journey
              </button>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Home; 