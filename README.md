
# Freysa Game Leaderboard Dashboard

![Freysa Logo](attached_assets/profile-freysa-original.jpg)

An interactive web application for tracking and analyzing Freysa game leaderboard data, with advanced automated snapshot management and comprehensive performance insights across multiple global cities.

## Features

### Data Visualization
- **Real-time Leaderboard**: Track player rankings with real-time updates
- **Multiple View Options**: Table, Card, and Timeline views for different analytical perspectives
- **City Filtering**: Filter players by their home city (London, San Francisco, Tokyo, New York, Mumbai, Berlin)
- **Sorting Options**: Sort by score, followers, likes, and retweets
- **Search Functionality**: Find specific players by username or city

### Player Profiles
- **Detailed Agent Information**: View comprehensive player stats including:
  - Wallet address (with links to BaseScan)
  - ETH balance (rounded to 3 decimal places)
  - Social metrics (followers, likes, retweets)
  - Location data
  - Mastodon bio and profile links
  - Historical performance data

### Data Management
- **Automated Daily Snapshots**: System automatically creates daily snapshots of leaderboard data
- **Historical Data Analysis**: Compare performance across different time periods
- **Robust Caching**: Optimized performance with intelligent caching strategies
- **Fallback Mechanism**: Graceful transition to snapshot data when live API fails

### Technical Implementation
- **Type Safety**: Comprehensive TypeScript schema validation
- **Graceful Error Handling**: Using safeParse() for validation with fallbacks
- **Multiple Data Sources**: Integration with external APIs and historical snapshots
- **Memory Optimization**: Efficient data structures to handle large datasets
- **Toast Notifications**: User-friendly alerts for data source changes

## Technical Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Data Fetching**: TanStack Query (React Query v5)
- **State Management**: React Hooks
- **Data Visualization**: Recharts
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **API Integration**: Axios for data fetching
- **Storage**: In-memory with automated persistence

## API Endpoints

- **Leaderboard Data**: `https://digital-clone-production.onrender.com/digital-clones/leaderboards?full=true`
- **Player Details**: `https://digital-clone-production.onrender.com/digital-clones/clones/{mastadonUsername}`

## Implemented Features & Fixes

- ✅ **Avatar Display**: Fixed avatar rendering by supporting both field naming conventions (`avatarURL`/`avatarUrl`)
- ✅ **Validation**: Improved error handling with safeParse() for graceful schema validation
- ✅ **Data Persistence**: Implemented daily snapshot system with backup cache
- ✅ **Debugging**: Added runtime data structure debugging for better error tracing
- ✅ **Type Safety**: Fixed TypeScript validation errors in live-api.ts
- ✅ **Performance**: Optimized data fetching with caching to reduce API calls
- ✅ **Resilience**: Added fallback mechanisms for API failures with toast notifications
- ✅ **Schema Flexibility**: Updated Zod schemas to better match API response variability
- ✅ **City Statistics**: Added comprehensive city-based analytics with color-coded visualizations
- ✅ **Enhanced Timeline Views**: Implemented score change tracking over time
- ✅ **Relative Time Formatting**: Added human-readable time displays for snapshots
- ✅ **Rank Change Indicators**: Visual cues for player rank movements
- ✅ **Automated Enrichment**: Background processing of detailed player information
- ✅ **Responsive Design**: Improved mobile and tablet experiences
- ✅ **Dark Mode Support**: Enhanced UI with consistent dark theme
- ✅ **Error Boundary Implementation**: Graceful handling of runtime exceptions
- ✅ **Optimized Rendering**: Reduced unnecessary component re-renders
- ✅ **Code Cleanup**: Removed unused CSV import functionality

## Architecture

The application follows a modern web application pattern with these key components:

1. **Data Layer**: 
   - `shared/schema.ts`: Defines the core data models and validation schemas
   - `server/storage.ts`: Implements the storage interface for data persistence
   - `server/live-api.ts`: Handles external API communication and data transformation

2. **Backend Services**:
   - `server/routes.ts`: Defines REST API endpoints for the client
   - `server/snapshot-service.ts`: Manages scheduled snapshots and historical data
   - `server/live-api.ts`: Handles external API communication with fallback mechanisms

3. **Frontend Views**:
   - `client/src/pages`: Contains the main application pages
   - `client/src/components`: Reusable UI components
   - `client/src/hooks`: Custom React hooks for shared functionality
   - `client/src/utils`: Utility functions for data formatting and processing

## Project Timeline

- **Initial Implementation**: Base application with real-time leaderboard
- **Schema Improvements**: Enhanced type safety and validation
- **View Options**: Added multiple visualization modes (Table, Card, Timeline)
- **Snapshot System**: Implemented automated daily snapshots
- **Profile Enhancements**: Added detailed player profile information
- **Performance Optimization**: Improved caching and data fetching
- **Error Resilience**: Added graceful error handling throughout
- **Analytics Dashboard**: Added comprehensive statistical analysis
- **City Filtering**: Enhanced location-based data exploration
- **Mobile Responsiveness**: Improved cross-device compatibility

## Future Improvements

Potential areas for future enhancement:

- Enhanced mobile-responsive design optimization
- Advanced analytics with trend visualization
- Player performance predictions
- Social engagement tracking
- Real-time notifications for ranking changes
- Extended historical data analysis
- Advanced filtering options
- Customizable dashboard views
- User authentication and personalized views
- Export functionality for data analysis

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open http://localhost:5000 in your browser

## Project Structure

```
├── client               # Frontend React application
│   ├── public           # Static assets
│   └── src              # React source code
│       ├── components   # UI components
│       ├── hooks        # Custom React hooks
│       ├── lib          # Utility functions
│       ├── pages        # Application pages
│       └── utils        # Helper utilities
├── data                 # Data files for the application
├── scripts              # Utility scripts
├── server               # Backend Express server
│   ├── live-api.ts      # External API integration with fallback logic
│   ├── routes.ts        # API routes with error handling
│   ├── snapshot-service.ts # Snapshot management for data persistence
│   └── storage.ts       # Data storage interface
└── shared               # Shared code between client and server
    └── schema.ts        # Data models and validation schemas
```

## Schema Overview

The application uses a robust data model with these core entities:

- **Agent**: Represents a player in the Freysa game
- **Snapshot**: Captures the state of the leaderboard at a point in time
- **Tweet**: Social media content from players
- **AgentFilters**: Parameters for filtering the leaderboard display
- **AgentDetails**: Extended details for an individual player

---

Developed with ❤️ for the Freysa.ai community.
