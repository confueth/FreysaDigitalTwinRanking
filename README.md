
# Freysa ACT IV Digital Twin Leaderboard

<img src="attached_assets/profile-freysa-original.jpg" alt="Freysa Logo" width="150" />

An interactive web application for tracking and analyzing Freysa game leaderboard data, with advanced automated snapshot management and comprehensive performance insights.

## Features

### Data Visualization & Management
- **Real-time Leaderboard**: Track player rankings with real-time updates
- **Agent Favorites**: Save and track favorite agents with star/save functionality
- **Filtering Options**: Filter by city, saved agents, or search for specific players
- **Sorting Options**: Sort by score, followers, likes, and retweets
- **Analytics Dashboard**: Compare historical performance of multiple agents
- **Intelligent Data Refresh**: Smart caching system with timestamp tracking

### Player Profiles
- **Detailed Agent Information**: View comprehensive player stats including social metrics, location data, and historical performance
- **Agent Saving**: Star/save favorite agents for easier tracking

### Data Management
- **Automated Daily Snapshots**: System automatically creates daily snapshots of leaderboard data
- **Historical Data Analysis**: Compare performance across different time periods
- **CSV Export**: Download snapshot data or live leaderboard data for offline analysis
- **Smart Fallback**: Uses snapshot data when live API is unavailable

## Technical Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Data Fetching**: TanStack Query (React Query v5)
- **Data Visualization**: Recharts
- **Deployment**: Replit with automatic refresh and caching mechanisms

## Latest Updates

### March 10, 2025
- ✅ **Responsive Layout Improvements**: Enhanced homepage layout with better spacing and consistent appearance across different screen sizes
- ✅ **Fixed UI Rendering Issues**: Resolved icon positioning issues on large monitors with proper containment
- ✅ **Two-Column Layout**: Implemented space-efficient two-column layouts for filters and stat cards on larger screens
- ✅ **Added Hover Effects**: Enhanced interactive elements with subtle hover effects for better user experience
- ✅ **Optimized Mobile Experience**: Improved touch targets and spacing for mobile users

### March 9, 2025
- ✅ **Documentation Update**: Updated README with latest project changes and features
- ✅ **Chart Optimization**: Fixed chart rendering issues with width and height handling
- ✅ **Data Refresh Reliability**: Enhanced data refresh mechanisms for better reliability
- ✅ **User Experience Enhancements**: Improved feedback during snapshot loading and data transitions

### March 7, 2025
- ✅ **README Improvements**: Updated documentation to reflect all recent changes
- ✅ **Agent Saving Enhancements**: Improved star/save functionality with better UX feedback
- ✅ **Data Caching**: Optimized API requests with intelligent caching based on user activity
- ✅ **Performance Improvements**: Reduced unnecessary renders and improved loading experience

### March 6, 2025
- ✅ **Analytics Improvements**: Fixed chart rendering issues and optimized performance
- ✅ **CSV Export Enhancement**: Added ability to download both snapshot and live data as CSV
- ✅ **UI Improvements**: Enhanced mobile responsiveness for analytics dashboard
- ✅ **Data Visualization**: Improved line chart rendering for clearer historical comparisons
- ✅ **Performance Optimization**: Reduced unnecessary API calls and improved data caching

### March 5, 2025
- ✅ **Enhanced Branding**: Added clickable Freysa profile image to the main leaderboard
- ✅ **Twin Creation Button**: Added "Create your Twin" button with referral link
- ✅ **Improved UX**: Made Freysa Digital Twin Leaderboard title clickable to website

### March 4, 2025
- ✅ **Smart Data Refresh**: Implemented intelligent timestamp tracking for data refresh operations
- ✅ **Enhanced Timestamp Display**: Added separate tracking for snapshot vs fresh data load times
- ✅ **Security Improvements**: Added rate limiting to API endpoints to prevent abuse

### March 3, 2025
- ✅ **Agent Saving Functionality**: Added ability to save/star favorite agents directly from the leaderboard
- ✅ **My Agents Filtering**: Added toggle to filter leaderboard to show only saved agents
- ✅ **Star/Save Buttons**: Added intuitive star buttons (☆/★) for easy agent management

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open http://localhost:5000 in your browser

## Project Structure

```
├── client               # Frontend React application
│   ├── public           # Static assets
│   ├── src              # React source code
│   │   ├── components   # UI components
│   │   ├── hooks        # Custom React hooks
│   │   ├── lib          # Utility libraries
│   │   ├── pages        # Page components
│   │   ├── types        # TypeScript type definitions
│   │   └── utils        # Helper functions
├── server               # Backend Express server
│   ├── db.ts            # Database connection and queries
│   ├── routes.ts        # API endpoint definitions
│   ├── snapshot-service.ts # Snapshot management service
│   └── live-api.ts      # Live data API handlers
├── shared               # Shared code between client and server
│   └── schema.ts        # Data schemas and types
├── data                 # Data files for the application
├── scripts              # Utility scripts
└── attached_assets      # Project images and resources
```

## Performance Features

- **Intelligent Caching**: Client-side caching reduces API calls
- **User Activity Tracking**: Refreshes data only when users are active
- **Snapshot Fallback**: Gracefully handles API unavailability
- **Rate Limiting**: Prevents API abuse and ensures stability
- **Optimized Data Loading**: Loads large datasets efficiently with pagination

## Responsive Design Features

- **Adaptive Layout**: Optimized layouts for mobile, tablet, and desktop displays
- **Grid System**: Responsive grid layouts that adjust based on screen size
- **Sticky Components**: Fixed-position header and sidebar for better navigation on large screens
- **Overflow Protection**: Prevents content overflow on any screen size with proper containment
- **Flexible Card System**: Card components that maintain consistency across all device sizes
- **Touch-Friendly Interface**: Properly sized touch targets for mobile users

---

Developed with ❤️ by Confu.eth for the Freysa.ai community.
