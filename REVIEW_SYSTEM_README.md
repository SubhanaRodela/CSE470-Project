# Review System Implementation

This document describes the comprehensive review system that has been implemented for the Rodela service provider platform.

## Features

### 🗨️ **Review Management**
- **Create Reviews**: Users can post reviews with ratings (1-5 stars) and comments
- **Edit Reviews**: Users can edit their own reviews with edit history tracking
- **Delete Reviews**: Users can delete their own reviews
- **Rating System**: 5-star rating system with descriptive labels

### 👍👎 **Like/Dislike System**
- **Like Reviews**: Users can like reviews they find helpful
- **Dislike Reviews**: Users can dislike reviews they disagree with
- **Toggle Functionality**: Clicking like/dislike again removes the action
- **Mutual Exclusion**: Liking automatically removes dislike and vice versa

### 💬 **Reply System**
- **Reply to Reviews**: Users can reply to existing reviews
- **Nested Comments**: Replies are displayed under their parent reviews
- **Reply Management**: Users can edit/delete their own replies

### 🔒 **Security & Privacy**
- **JWT Authentication**: All review operations require valid JWT tokens
- **User Ownership**: Users can only edit/delete their own reviews
- **Self-Review Prevention**: Users cannot review themselves
- **Duplicate Prevention**: Users can only post one main review per service provider

## Database Schema

### Review Collection Structure
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),           // User who wrote the review
  serviceProvider: ObjectId (ref: User), // Service provider being reviewed
  comment: String,                       // Review text (max 1000 chars)
  rating: Number,                        // Rating 1-5
  likes: [ObjectId],                     // Array of user IDs who liked
  dislikes: [ObjectId],                  // Array of user IDs who disliked
  parentReview: ObjectId,                // For replies (null for main reviews)
  replies: [ObjectId],                   // Array of reply review IDs
  isEdited: Boolean,                     // Whether review was edited
  editHistory: [{                        // Edit history tracking
    comment: String,
    editedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Virtual Fields
- `likeCount`: Number of likes
- `dislikeCount`: Number of dislikes  
- `replyCount`: Number of replies

## API Endpoints

### 📍 **Get Service Provider Reviews**
```
GET /api/reviews/service-provider/:serviceProviderId
```
Returns all reviews for a specific service provider with populated user info and replies.

### ✍️ **Create Review**
```
POST /api/reviews
Authorization: Bearer <JWT_TOKEN>
Body: {
  serviceProviderId: String,
  comment: String,
  rating: Number (optional, default: 5),
  parentReviewId: String (optional, for replies)
}
```

### ✏️ **Update Review**
```
PUT /api/reviews/:reviewId
Authorization: Bearer <JWT_TOKEN>
Body: {
  comment: String,
  rating: Number (optional)
}
```

### 🗑️ **Delete Review**
```
DELETE /api/reviews/:reviewId
Authorization: Bearer <JWT_TOKEN>
```

### 👍 **Like Review**
```
POST /api/reviews/:reviewId/like
Authorization: Bearer <JWT_TOKEN>
```

### 👎 **Dislike Review**
```
POST /api/reviews/:reviewId/dislike
Authorization: Bearer <JWT_TOKEN>
```

### 👤 **Get User Reviews**
```
GET /api/reviews/user
Authorization: Bearer <JWT_TOKEN>
```

## Frontend Components

### ReviewModal Component
- **Location**: `client/src/components/ReviewModal.jsx`
- **Features**: 
  - Review creation form with rating selection
  - Reviews list with like/dislike/reply actions
  - Edit/delete functionality for user's own reviews
  - Reply system with nested display
  - Responsive design for mobile and desktop

### Integration in UserDashboard
- **Chat Icon**: Added chat icon (💬) next to each service provider
- **Modal Trigger**: Clicking the icon opens the review modal
- **Provider Context**: Modal displays reviews specific to the selected provider

## CSS Styling

### ReviewModal.css
- **Modern Design**: Clean, professional appearance
- **Responsive Layout**: Adapts to different screen sizes
- **Interactive Elements**: Hover effects and smooth transitions
- **Color Scheme**: Consistent with the overall application theme

## Usage Instructions

### For Users
1. **View Reviews**: Click the chat icon (💬) next to any service provider
2. **Write Review**: Fill out the review form with rating and comment
3. **Interact**: Like/dislike reviews and reply to others
4. **Manage**: Edit or delete your own reviews

### For Developers
1. **Start Server**: Ensure MongoDB is running and start the server
2. **Test System**: Run `node test-reviews.js` to verify functionality
3. **API Testing**: Use the documented endpoints for testing
4. **Frontend**: The modal automatically loads when clicking chat icons

## Security Considerations

- **JWT Validation**: All review operations require valid authentication
- **User Authorization**: Users can only modify their own content
- **Input Validation**: Comment length limits and rating validation
- **SQL Injection Prevention**: Uses Mongoose with proper parameterization

## Performance Features

- **Database Indexing**: Optimized queries for service provider and user lookups
- **Population**: Efficient loading of related user data
- **Virtual Fields**: Computed like/dislike counts without additional queries
- **Pagination Ready**: Structure supports future pagination implementation

## Future Enhancements

- **Review Moderation**: Admin approval system for reviews
- **Review Analytics**: Rating statistics and trends
- **Photo Attachments**: Allow users to attach images to reviews
- **Review Search**: Search functionality within reviews
- **Notification System**: Notify service providers of new reviews

## Testing

Run the test script to verify the review system:
```bash
cd server
node test-reviews.js
```

This will:
- Connect to MongoDB
- Check existing data
- Test review creation/deletion
- Display available API endpoints
- Verify system functionality

## Troubleshooting

### Common Issues
1. **Modal Not Opening**: Check browser console for JavaScript errors
2. **Reviews Not Loading**: Verify server is running and MongoDB connection
3. **Authentication Errors**: Ensure JWT token is valid and not expired
4. **Database Errors**: Check MongoDB connection and collection existence

### Debug Steps
1. Check server logs for API errors
2. Verify JWT token in localStorage
3. Test API endpoints with Postman/curl
4. Check browser network tab for failed requests

## Dependencies

### Server
- `mongoose`: MongoDB ODM
- `express`: Web framework
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing

### Client
- `react`: UI framework
- `react-router-dom`: Routing
- `bootstrap-icons`: Icon library

The review system is now fully integrated and ready for use! 🎉 