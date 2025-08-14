import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ReviewModal.css';

const ReviewModal = ({ isOpen, onClose, serviceProvider, user }) => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [editingReview, setEditingReview] = useState(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyComment, setReplyComment] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  useEffect(() => {
    console.log('ReviewModal useEffect triggered:', { isOpen, serviceProvider });
    if (isOpen && serviceProvider) {
      console.log('Modal is open and service provider exists, loading reviews...');
      loadReviews();
    } else if (isOpen && !serviceProvider) {
      console.log('Modal is open but no service provider provided');
    }
  }, [isOpen, serviceProvider]);

  const loadReviews = async () => {
    if (!serviceProvider) {
      console.log('No service provider provided for loadReviews');
      return;
    }
    
    console.log('Loading reviews for service provider:', serviceProvider);
    console.log('Service provider ID:', serviceProvider.id);
    
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/reviews/service-provider/${serviceProvider.id}`
      );
      const data = await response.json();
      console.log('Reviews response:', data);
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Check if serviceProvider exists and has an ID
    if (!serviceProvider || !serviceProvider.id) {
      alert('Service provider information is missing. Please try again.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      console.log('Submitting review with data:', {
        serviceProviderId: serviceProvider.id,
        comment: newComment,
        rating,
        serviceProvider: serviceProvider
      });

      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceProviderId: serviceProvider.id,
          comment: newComment,
          rating
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setNewComment('');
        setRating(5);
        loadReviews();
      } else {
        alert(data.message || 'Error creating review');
      }
    } catch (error) {
      console.error('Error creating review:', error);
      alert('Error creating review: ' + error.message);
    }
  };

  const handleEditReview = async (e) => {
    e.preventDefault();
    if (!editComment.trim() || !editingReview) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/reviews/${editingReview._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          comment: editComment,
          rating: editRating
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditingReview(null);
        setEditComment('');
        setEditRating(5);
        loadReviews();
      } else {
        alert(data.message || 'Error updating review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Error updating review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        loadReviews();
      } else {
        alert(data.message || 'Error deleting review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error deleting review');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyComment.trim() || !replyingTo) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceProviderId: serviceProvider.id,
          comment: replyComment,
          parentReviewId: replyingTo.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setReplyingTo(null);
        setReplyComment('');
        setShowReplyForm(false);
        loadReviews();
      } else {
        alert(data.message || 'Error creating reply');
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('Error creating reply');
    }
  };

  const handleLike = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        loadReviews();
      }
    } catch (error) {
      console.error('Error liking review:', error);
    }
  };

  const handleDislike = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/reviews/${reviewId}/dislike`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        loadReviews();
      }
    } catch (error) {
      console.error('Error disliking review:', error);
    }
  };

  const startEdit = (review) => {
    setEditingReview(review);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const cancelEdit = () => {
    setEditingReview(null);
    setEditComment('');
    setEditRating(5);
  };

  const startReply = (review) => {
    setReplyingTo(review);
    setShowReplyForm(true);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyComment('');
    setShowReplyForm(false);
  };

  const isUserLiked = (review) => {
    return review.likes && review.likes.includes(user?.id);
  };

  const isUserDisliked = (review) => {
    return review.dislikes && review.dislikes.includes(user?.id);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h3>Reviews for {serviceProvider?.name}</h3>
          <button className="close-button" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="review-modal-content">
          {/* New Review Form */}
          <div className="new-review-form">
            <h5>Write a Review</h5>
            <form onSubmit={handleSubmitReview}>
              <div className="rating-input">
                <label>Rating:</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
              <textarea
                placeholder="Write your review..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <button type="submit" className="btn btn-primary">
                Submit Review
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="reviews-list">
            <h5>All Reviews</h5>
            {loading ? (
              <div className="text-center">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center text-muted">No reviews yet. Be the first to review!</div>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="review-item">
                  <div className="review-header">
                    <div className="review-info">
                      <strong>{review.user?.name}</strong>
                      <span className="rating">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      <span className="date">{formatDate(review.createdAt)}</span>
                      {review.isEdited && <span className="edited-badge">(edited)</span>}
                    </div>
                    {user && review.user?._id === user.id && (
                      <div className="review-actions">
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => startEdit(review)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit Form */}
                  {editingReview?._id === review._id ? (
                    <form onSubmit={handleEditReview} className="edit-form">
                      <div className="rating-input">
                        <label>Rating:</label>
                        <select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>
                          <option value={5}>5 - Excellent</option>
                          <option value={4}>4 - Very Good</option>
                          <option value={3}>3 - Good</option>
                          <option value={2}>2 - Fair</option>
                          <option value={1}>1 - Poor</option>
                        </select>
                      </div>
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={3}
                        maxLength={1000}
                      />
                      <div className="edit-actions">
                        <button type="submit" className="btn btn-sm btn-primary">Save</button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="review-content">
                      <p>{review.comment}</p>
                    </div>
                  )}

                  {/* Like/Dislike/Reply Actions */}
                  <div className="review-actions-bottom">
                    <button 
                      className={`action-btn ${isUserLiked(review) ? 'liked' : ''}`}
                      onClick={() => handleLike(review._id)}
                    >
                      <i className="bi bi-hand-thumbs-up"></i>
                      <span>{review.likeCount || 0}</span>
                    </button>
                    <button 
                      className={`action-btn ${isUserDisliked(review) ? 'disliked' : ''}`}
                      onClick={() => handleDislike(review._id)}
                    >
                      <i className="bi bi-hand-thumbs-down"></i>
                      <span>{review.dislikeCount || 0}</span>
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => startReply(review)}
                    >
                      <i className="bi bi-reply"></i>
                      <span>Reply</span>
                    </button>
                  </div>

                  {/* Reply Form */}
                  {replyingTo?._id === review._id && showReplyForm && (
                    <form onSubmit={handleReply} className="reply-form">
                      <textarea
                        placeholder="Write your reply..."
                        value={replyComment}
                        onChange={(e) => setReplyComment(e.target.value)}
                        rows={2}
                        maxLength={500}
                      />
                      <div className="reply-actions">
                        <button type="submit" className="btn btn-sm btn-primary">Reply</button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelReply}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {/* Replies */}
                  {review.replies && review.replies.length > 0 && (
                    <div className="replies-section">
                      {review.replies.map((reply) => (
                        <div key={reply._id} className="reply-item">
                          <div className="reply-header">
                            <strong>{reply.user?.name}</strong>
                            <span className="date">{formatDate(reply.createdAt)}</span>
                            {reply.isEdited && <span className="edited-badge">(edited)</span>}
                          </div>
                          <p>{reply.comment}</p>
                          <div className="reply-actions-bottom">
                            <button 
                              className={`action-btn ${isUserLiked(reply) ? 'liked' : ''}`}
                              onClick={() => handleLike(reply._id)}
                            >
                              <i className="bi bi-hand-thumbs-up"></i>
                              <span>{reply.likeCount || 0}</span>
                            </button>
                            <button 
                              className={`action-btn ${isUserDisliked(reply) ? 'disliked' : ''}`}
                              onClick={() => handleDislike(reply._id)}
                            >
                              <i className="bi bi-hand-thumbs-down"></i>
                              <span>{reply.dislikeCount || 0}</span>
                            </button>
                            {user && reply.user?._id === user.id && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteReview(reply._id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal; 