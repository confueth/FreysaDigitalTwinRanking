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

  // Query agents with filters
  const { 
    data: agents, 
    isLoading: agentsLoading,
    refetch: refetchAgents
  } = useQuery({
    queryKey: [
      `/api/snapshots/${selectedSnapshot}/agents`, 
      filters
    ],
    enabled: !!selectedSnapshot,
    queryFn: async ({ queryKey }) => {
      // Extract the base URL and filters from the query key
      const [baseUrl, filterParams] = queryKey;
      
      // Build query string from filters
      const params = new URLSearchParams();
      Object.entries(filterParams as Record<string, any>).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
      
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      return response.json();
    }
  });

  // Query stats for the selected snapshot
  const { data: stats } = useQuery({
    queryKey: [`/api/snapshots/${selectedSnapshot}/stats`],
    enabled: !!selectedSnapshot,
    staleTime: 60000 // 1 minute
  });

  // Query cities for filter dropdown
  const { data: cities } = useQuery({
    queryKey: ['/api/cities'],
    staleTime: 300000 // 5 minutes
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
                  `Showing ${displayAgents.length} of ${totalAgentsCount} filtered agents (${stats?.totalAgents || '?'} total)` : 
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
