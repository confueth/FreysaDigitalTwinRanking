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

### Player Profiles
- **Detailed Agent Information**: View comprehensive player stats including social metrics, location data, and historical performance

### Data Management
- **Automated Daily Snapshots**: System automatically creates daily snapshots of leaderboard data
- **Historical Data Analysis**: Compare performance across different time periods
- **CSV Export**: Download snapshot data or live leaderboard data for offline analysis

## Technical Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Data Fetching**: TanStack Query (React Query v5)
- **Data Visualization**: Recharts

## Latest Updates

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
├── server               # Backend Express server
├── shared               # Shared code between client and server
├── data                 # Data files for the application
└── scripts              # Utility scripts
```

---

Developed with ❤️ by Confu.eth for the Freysa.ai community.