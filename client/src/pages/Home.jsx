import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="container-fluid">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-lg-10 col-xl-8 text-center">
            <div className="card shadow-lg">
              <div className="card-body p-5">
                <h1 className="display-4 mb-4 text-primary">Welcome to QuickFix</h1>
                <p className="lead mb-5">Your trusted platform for connecting with skilled service providers</p>
                
                <div className="d-grid gap-3">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => navigate('/register')}
                  >
                    Register
                  </button>
                  <button 
                    className="btn btn-outline-primary btn-lg"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 