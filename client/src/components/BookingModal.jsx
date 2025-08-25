import { useState } from 'react';
import '../styles/BookingModal.css';

const BookingModal = ({ isOpen, onClose, serviceProvider, onBookingSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bookingDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.bookingDate) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceProviderId: serviceProvider.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          bookingDate: formData.bookingDate
        })
      });

      const data = await response.json();

      if (data.success) {
        onBookingSuccess(data.booking);
        onClose();
        setFormData({ title: '', description: '', bookingDate: '' });
      } else {
        setError(data.message || 'Failed to create booking');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ title: '', description: '', bookingDate: '' });
    setError('');
    onClose();
  };

  const getMinDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="booking-modal-overlay" onClick={handleClose}>
      <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-modal-header">
          <h3>Book Service</h3>
          <button className="close-button" onClick={handleClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="booking-modal-body">
          <div className="provider-info mb-3">
            <h5>Service Provider: {serviceProvider.name}</h5>
            <p className="text-muted mb-0">Occupation: {serviceProvider.occupation}</p>
            {serviceProvider.charge && (
              <p className="text-success mb-0">
                <strong>Service Charge:</strong> ${serviceProvider.charge}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label htmlFor="title" className="form-label">Service Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Plumbing Repair, Electrical Installation"
                maxLength={100}
                required
              />
            </div>

            <div className="form-group mb-3">
              <label htmlFor="description" className="form-label">Service Description *</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                rows="4"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the service you need in detail..."
                maxLength={1000}
                required
              />
            </div>

            <div className="form-group mb-4">
              <label htmlFor="bookingDate" className="form-label">Preferred Date *</label>
              <input
                type="date"
                id="bookingDate"
                name="bookingDate"
                className="form-control"
                value={formData.bookingDate}
                onChange={handleInputChange}
                min={getMinDate()}
                required
              />
              <small className="form-text text-muted">
                Select a future date for your service
              </small>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="booking-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating...
                  </>
                ) : (
                  'Book Now'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
