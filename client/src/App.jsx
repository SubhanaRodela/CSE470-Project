import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import ServiceProviderDashboard from './pages/ServiceProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Chatbox from './pages/chatbox';
import ShowProfile from './pages/showProfile';
import Orders from './pages/orders';
import UserService from './pages/userService';
import Pay from './pages/pay';
import QPayReg from './pages/qpayreg';
import QPay from './pages/qpay';
import TransactionHistory from './pages/trhistory';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: '#4aed88',
              },
            },
            error: {
              duration: 4000,
              theme: {
                primary: '#ff4b4b',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/service-provider-dashboard" element={<ServiceProviderDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chatbox" element={<Chatbox />} />
          <Route path="/show-profile" element={<ShowProfile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/user-service" element={<UserService />} />
                  <Route path="/pay" element={<Pay />} />
        <Route path="/qpayreg" element={<QPayReg />} />
        <Route path="/qpay" element={<QPay />} />
        <Route path="/transaction-history" element={<TransactionHistory />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
