import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import LeaderboardTable from '@/components/LeaderboardTable';
import LeaderboardCards from '@/components/LeaderboardCards';
import LeaderboardTimeline from '@/components/LeaderboardTimeline';
import StatCards from '@/components/StatCards';
import AgentDetailModal from '@/components/AgentDetailModal';
import { Agent, AgentFilters, Snapshot } from '@/types/agent';
import { formatDate } from '@/utils/formatters';
import { applyAllFilters } from '@/utils/FilterUtils';

type ViewMode = 'table' | 'cards' | 'timeline';

export default function Home() {
  const [selectedView, setSelectedView] = useState<ViewMode>('table');
  // Fixed snapshot ID for backward compatibility during transition to live data
  const [selectedSnapshot, setSelectedSnapshot] = useState<number>(1);
  const [filters, setFilters] = useState<AgentFilters>({
    page: 1,
    limit: 50,
    sortBy: 'score'
  });
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  
  // Set dummy loading state
  const snapshotLoading = false;
  
  // Create a fake snapshot object for display
  const currentSnapshot = {
    id: 1,
    timestamp: new Date().toISOString(),
    description: "Live Data"
  };

  // Query agents with filters - optimized with caching strategy
  const { 
    data: agents, 
    isLoading: agentsLoading,
    refetch: refetchAgents
  } = useQuery({
    queryKey: [
      `/api/snapshots/${selectedSnapshot}/agents`, 
      // Only include filter parameters that affect the server request
      // Client-side filtering is used for performance
      { 
        limit: 2000 // Get a larger batch once to reduce API calls (increased from 1000)
      }
    ],
    enabled: !!selectedSnapshot,
    queryFn: async ({ queryKey }) => {
      const [baseUrl] = queryKey;
      
      // Check if we have data in sessionStorage cache
      const cacheKey = `leaderboard_data_${selectedSnapshot}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's available and less than 10 minutes old
      if (cachedData && cacheTime) {
        const cacheAge = Date.now() - parseInt(cacheTime, 10);
        if (cacheAge < 10 * 60 * 1000) { // 10 minutes
          console.log('Using cached leaderboard data');
          return JSON.parse(cachedData);
        }
      }
      
      console.log('Fetching fresh leaderboard data');
      const response = await fetch(`${baseUrl}?limit=2000`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await response.json();
      
      // Cache the results
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      } catch (e) {
        console.warn('Failed to cache leaderboard data', e);
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetching
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
  });

  // Query stats for the selected snapshot - optimized with longer cache time
  const { data: stats } = useQuery({
    queryKey: [`/api/snapshots/${selectedSnapshot}/stats`],
    enabled: !!selectedSnapshot,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce repeated fetches
    gcTime: 10 * 60 * 1000, // Keep in memory longer
  });

  // Query cities for filter dropdown - optimized with memory cache
  const { data: cities } = useQuery({
    queryKey: ['/api/cities'],
    staleTime: 60 * 60 * 1000, // 1 hour - cities change very rarely
    gcTime: 120 * 60 * 1000 // 2 hours
  });

  // Handle view change
  const handleViewChange = (view: ViewMode) => {
    setSelectedView(view);
  };



  // Handle filter change
  const handleFilterChange = (newFilters: Partial<AgentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  };

  // Handle agent selection
  const handleAgentSelect = (username: string) => {
    setSelectedAgent(username);
    setShowAgentModal(true);
  };

  // Handle closing agent modal
  const handleCloseAgentModal = () => {
    setShowAgentModal(false);
    setSelectedAgent(null);
  };


  
  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Determine the title based on selected view
  const viewTitle = selectedView === 'table' 
    ? 'Leaderboard Rankings' 
    : selectedView === 'cards' 
      ? 'Agent Cards' 
      : 'Score Trends';

  // Memoized refreshData function
  const refreshData = useCallback(() => {
    // Don't refresh if user has been inactive for a while
    const INACTIVITY_THRESHOLD = 1 * 60 * 60 * 1000; // 1 hour
    const lastActivity = parseInt(localStorage.getItem('lastUserActivity') || '0', 10);
    const now = Date.now();
    
    if (now - lastActivity > INACTIVITY_THRESHOLD) {
      console.log('Skipping refresh due to user inactivity');
      return;
    }
    
    if (selectedSnapshot) {
      console.log('Refreshing data');
      queryClient.invalidateQueries({ 
        queryKey: [`/api/snapshots/${selectedSnapshot}/agents`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/snapshots/${selectedSnapshot}/stats`] 
      });
    }
  }, [selectedSnapshot, queryClient]);
  
  // Apply client-side filtering to reduce server load
  const filteredResults = useMemo(() => {
    if (!agents || !agents.length) return { filteredAgents: [], totalCount: 0 };
    return applyAllFilters(agents, filters);
  }, [agents, filters]);
  
  // Display data - this is now client-side filtered
  const displayAgents = filteredResults.filteredAgents || [];
  const totalAgentsCount = filteredResults.totalCount || 0;
  
  // Poll for new data infrequently to avoid excessive API calls
  useEffect(() => {
    // Track user activity
    const updateLastActivity = () => {
      localStorage.setItem('lastUserActivity', Date.now().toString());
    };
    
    // Update on any user interaction
    window.addEventListener('mousemove', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('click', updateLastActivity);
    window.addEventListener('scroll', updateLastActivity);
    
    // Initial activity timestamp
    updateLastActivity();
    
    // Set up infrequent polling (once every 30 minutes)
    // This respects our API usage and ensures data is eventually refreshed
    const interval = setInterval(refreshData, 30 * 60 * 1000); // 30 minutes
    
    // Add event listener to refresh data when user returns to tab
    // This provides fresh data when users are actually using the app
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Only refresh if we've been hidden for a while
        const lastRefresh = parseInt(localStorage.getItem('lastRefresh') || '0', 10);
        const now = Date.now();
        const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
        
        if (now - lastRefresh > REFRESH_THRESHOLD) {
          refreshData();
          localStorage.setItem('lastRefresh', now.toString());
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange, false);
    localStorage.setItem('lastRefresh', Date.now().toString());
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('mousemove', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('click', updateLastActivity);
      window.removeEventListener('scroll', updateLastActivity);
    };
  }, [refreshData]);

  return (
    <div>
      <Header 
        selectedView={selectedView}
        onViewChange={handleViewChange}
      />
      
      <main className="flex-grow flex flex-col md:flex-row">
        <Sidebar 
          filters={filters}
          onFilterChange={handleFilterChange}
          cities={cities || []}
          isLoading={snapshotLoading}
        />
        
        <div className="flex-grow p-4 overflow-auto">
          <StatCards 
            stats={stats} 
            snapshotTime={currentSnapshot ? formatDate(currentSnapshot.timestamp) : ''}
            isLoading={!stats}
          />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-xl font-bold">{viewTitle}</h2>
            <div className="flex space-x-2">
              <span className="text-gray-400">
                {agents ? 
                  `Showing ${displayAgents.length} of ${stats?.totalAgents || totalAgentsCount} filtered agents` : 
                  'Loading...'}
              </span>
            </div>
          </div>
          
          {selectedView === 'table' && (
            <LeaderboardTable 
              agents={displayAgents}
              onAgentSelect={handleAgentSelect}
              currentPage={filters.page || 1}
              onPageChange={handlePageChange}
              totalAgents={totalAgentsCount}
              pageSize={filters.limit || 50}
              isLoading={agentsLoading}
            />
          )}
          
          {selectedView === 'cards' && (
            <LeaderboardCards 
              agents={displayAgents}
              onAgentSelect={handleAgentSelect}
              currentPage={filters.page || 1}
              onPageChange={handlePageChange}
              totalAgents={totalAgentsCount}
              pageSize={filters.limit || 50}
              isLoading={agentsLoading}
            />
          )}
          
          {selectedView === 'timeline' && (
            <LeaderboardTimeline 
              stats={stats} 
              isLoading={!stats || agentsLoading}
            />
          )}
        </div>
      </main>
      
      {showAgentModal && selectedAgent && (
        <AgentDetailModal 
          username={selectedAgent}
          isOpen={showAgentModal}
          onClose={handleCloseAgentModal}
        />
      )}
    </div>
  );
}
