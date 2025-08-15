# Show Profile - Sliding Card Feature

## Overview
The Show Profile feature displays service provider details in a beautiful sliding card animation when users click on individual service providers from the list.

## Features

### 🎨 Sliding Card Animation
- **Slide-in Effect**: The profile card slides up from the bottom of the screen with a smooth cubic-bezier animation
- **Slide-out Effect**: When closing, the card slides back down before navigating away
- **Backdrop Blur**: The background is blurred with a semi-transparent overlay
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### 📱 User Interface
- **Modern Design**: Clean, modern UI with gradient headers and smooth transitions
- **Profile Header**: Displays provider name, occupation, and average rating with star display
- **Contact Information**: Shows phone, email, and address (if available)
- **Services Offered**: Displays service tags in a clean layout
- **About Section**: Shows provider's description
- **Recent Reviews**: Displays up to 3 recent reviews with ratings
- **Action Buttons**: Quick access to chat, show on map, and view all reviews

### 🔧 Functionality
- **Multiple Entry Points**: Can be accessed from:
  - Service provider search suggestions
  - All service providers list
  - Favorites list
  - Selected provider display
- **Navigation Integration**: Seamlessly integrates with existing navigation flow
- **State Management**: Handles provider data from both location state and URL parameters
- **Error Handling**: Graceful fallback if provider data is not available

## Implementation Details

### Components
- **ShowProfile.jsx**: Main component with sliding card logic
- **showProfile.css**: Comprehensive styling with animations and responsive design

### Routes
- **Path**: `/show-profile`
- **Method**: GET
- **Parameters**: 
  - `providerId` (optional): Provider ID from URL
  - `state.provider` (optional): Provider object from navigation state

### Animations
```css
/* Slide-in animation */
.show-profile-card {
  transform: translateY(100vh);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.show-profile-card.slide-in {
  transform: translateY(0);
}
```

### Integration Points

#### UserDashboard.jsx
- Added "View Profile" buttons to:
  - Provider search suggestions
  - All providers list
  - Favorites list
  - Selected provider display

#### Navigation Flow
1. User clicks "View Profile" button
2. Navigates to `/show-profile` with provider data in state
3. Card slides in from bottom
4. User can interact with profile or close
5. Card slides out and returns to previous page

## Usage Examples

### From Provider List
```javascript
navigate('/show-profile', { state: { provider } });
```

### From URL Parameter
```javascript
navigate('/show-profile?providerId=123');
```

### Close Profile
```javascript
// Automatic slide-out animation
setIsVisible(false);
setTimeout(() => navigate(-1), 300);
```

## Styling Features

### Responsive Breakpoints
- **Desktop**: Full-width card with side-by-side layout
- **Tablet**: Adjusted padding and button layout
- **Mobile**: Stacked layout with full-width buttons

### Color Scheme
- **Primary Gradient**: `#667eea` to `#764ba2`
- **Background**: White with subtle shadows
- **Text**: Dark grays for readability
- **Accents**: Bootstrap color classes for consistency

### Interactive Elements
- **Hover Effects**: Subtle transforms and color changes
- **Button States**: Active, hover, and disabled states
- **Loading States**: Spinner animation during data loading

## Browser Compatibility
- **Modern Browsers**: Full support for all features
- **CSS Grid/Flexbox**: Used for responsive layouts
- **CSS Transitions**: Smooth animations across all browsers
- **Backdrop Filter**: Progressive enhancement for blur effects

## Future Enhancements
- **Image Upload**: Profile pictures for service providers
- **Social Media Links**: Integration with social platforms
- **Booking System**: Direct appointment scheduling
- **Location Services**: Real-time distance calculation
- **Offline Support**: Cached provider data for offline viewing
