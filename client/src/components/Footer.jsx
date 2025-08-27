import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <div className="footer-widget">
                <div className="footer-logo mb-3">
                  <h3 className="text-white fw-bold">
                    <span className="highlight">Quick</span>Fix
                  </h3>
                </div>
                <p className="footer-description">
                  Your trusted platform for connecting with skilled service providers. 
                  Find reliable professionals for all your home and business needs.
                </p>
                <div className="social-links">
                  <a href="#" className="social-link" aria-label="Facebook">
                    <i className="bi bi-facebook"></i>
                  </a>
                  <a href="#" className="social-link" aria-label="Twitter">
                    <i className="bi bi-twitter-x"></i>
                  </a>
                  <a href="#" className="social-link" aria-label="Instagram">
                    <i className="bi bi-instagram"></i>
                  </a>
                  <a href="#" className="social-link" aria-label="LinkedIn">
                    <i className="bi bi-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>

            <div className="col-lg-2 col-md-6">
              <div className="footer-widget">
                <h5 className="footer-title">Quick Links</h5>
                <ul className="footer-links">
                  <li>
                    <a href="#" onClick={() => navigate('/')}>Home</a>
                  </li>
                  <li>
                    <a href="#" onClick={() => navigate('/register')}>Services</a>
                  </li>
                  <li>
                    <a href="#" onClick={() => navigate('/login')}>About Us</a>
                  </li>
                  <li>
                    <a href="#" onClick={() => navigate('/register')}>Contact</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-2 col-md-6">
              <div className="footer-widget">
                <h5 className="footer-title">Services</h5>
                <ul className="footer-links">
                  <li><a href="#">Plumbing</a></li>
                  <li><a href="#">Electrical</a></li>
                  <li><a href="#">Painting</a></li>
                  <li><a href="#">Carpentry</a></li>
                </ul>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="footer-widget">
                <h5 className="footer-title">Newsletter</h5>
                <p className="newsletter-text">
                  Subscribe to get updates on new services and special offers
                </p>
                <div className="newsletter-form">
                  <div className="input-group">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter your email"
                      aria-label="Email for newsletter"
                    />
                    <button className="btn btn-primary" type="button">
                      <i className="bi bi-send"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <p className="copyright-text mb-0">
                © {currentYear} QuickFix. All rights reserved.
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <div className="footer-bottom-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
