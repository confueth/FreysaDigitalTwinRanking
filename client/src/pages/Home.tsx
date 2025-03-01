import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import LeaderboardTable from '@/components/LeaderboardTable';
import LeaderboardCards from '@/components/LeaderboardCards';
import LeaderboardTimeline from '@/components/LeaderboardTimeline';
import StatCards from '@/components/StatCards';
import CityStatistics from '@/components/CityStatistics';

import AgentDetailModal from '@/components/AgentDetailModal';
import { Agent, AgentFilters, Snapshot, SnapshotStats } from '@/types/agent';
import { formatDate } from '@/utils/formatters';
import { applyAllFilters } from '@/utils/FilterUtils';

type ViewMode = 'table' | 'cards' | 'timeline';

export default function Home() {
  const { toast } = useToast();
  const [selectedView, setSelectedView] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<AgentFilters>({
    page: 1,
    limit: 25,
    sortBy: 'score'
  });
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  
  // Query available snapshots 
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery<Snapshot[]>({
    queryKey: ['/api/snapshots'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use the latest snapshot ID, fallback to 3 if not available yet
  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
  const [selectedSnapshot, setSelectedSnapshot] = useState<number>(3);
  
  // Update selected snapshot when snapshots data loads
  useEffect(() => {
    if (latestSnapshot) {
      setSelectedSnapshot(latestSnapshot.id);
    }
  }, [latestSnapshot]);
  
  // Current snapshot object for display
  const currentSnapshot = latestSnapshot || {
    id: selectedSnapshot,
    timestamp: new Date().toISOString(),
    description: "Loading snapshot data..."
  };

  // Query agents with filters - use live data by default for regular views with fallback to last snapshot
  const { 
    data: agents, 
    isLoading: agentsLoading,
    refetch: refetchAgents,
    error: liveDataError
  } = useQuery<Agent[]>({
    queryKey: [
      `/api/agents`, 
      { 
        limit: 2000 // Get a larger batch once to reduce API calls
      }
    ],
    queryFn: async ({ queryKey }) => {
      const [baseUrl] = queryKey;
      
      // Check if we have data in sessionStorage cache
      const cacheKey = `leaderboard_data_live`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's available and less than 5 minutes old (shorter time for live data)
      if (cachedData && cacheTime) {
        const cacheAge = Date.now() - parseInt(cacheTime, 10);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes 
          console.log('Using cached leaderboard data');
          return JSON.parse(cachedData) as Agent[];
        }
      }
      
      try {
        console.log('Fetching fresh leaderboard data');
        const response = await fetch(`${baseUrl}?limit=2000`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch live agents data');
        }
        
        const data = await response.json();
        
        // Cache the results
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
          sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        } catch (e) {
          console.warn('Failed to cache leaderboard data', e);
        }
        
        return data as Agent[];
      } catch (error) {
        console.error('Error fetching live data, will attempt to use snapshot data', error);
        // We'll try fallback to the latest snapshot data
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - more frequent updates for live data
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once to quickly fall back to snapshots if live data fails
  });
  
  // Query agents from latest snapshot (used as fallback when live data fails)
  const { 
    data: snapshotAgents,
    isLoading: snapshotAgentsLoading,
  } = useQuery<Agent[]>({
    queryKey: [
      `/api/snapshots/${selectedSnapshot}/agents`, 
      { 
        limit: 2000
      }
    ],
    enabled: !!selectedSnapshot && !!liveDataError, // Only run this query if live data fails
    staleTime: 10 * 60 * 1000, // 10 minutes - snapshots change less frequently
    gcTime: 20 * 60 * 1000, // 20 minutes
  });

  // Query stats for the selected snapshot - optimized with longer cache time
  const { data: stats } = useQuery<SnapshotStats | undefined>({
    queryKey: [`/api/snapshots/${selectedSnapshot}/stats`],
    enabled: !!selectedSnapshot,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce repeated fetches
    gcTime: 10 * 60 * 1000, // Keep in memory longer
  });

  // Query cities for filter dropdown - optimized with memory cache
  const { data: cities } = useQuery<string[]>({
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
    
    console.log('Refreshing data');
    
    // Invalidate the live data endpoints 
    queryClient.invalidateQueries({ 
      queryKey: [`/api/agents`] 
    });
    
    // Also invalidate stats if we have a selected snapshot for timeline view
    if (selectedSnapshot) {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/snapshots/${selectedSnapshot}/stats`] 
      });
    }
    
    // Invalidate cities list
    queryClient.invalidateQueries({ 
      queryKey: [`/api/cities`] 
    });
  }, [selectedSnapshot, queryClient]);
  
  // Show a toast notification when falling back to snapshot data
  useEffect(() => {
    if (liveDataError && snapshotAgents && snapshotAgents.length > 0) {
      toast({
        title: "Using snapshot data",
        description: "Live data is currently unavailable. Showing latest snapshot data instead.",
        variant: "default"
      });
    }
  }, [liveDataError, snapshotAgents, toast]);
  
  // Determine which data source to use - live data or snapshot fallback
  const displayDataSource = useMemo(() => {
    // Use live data if available, otherwise use snapshot data as fallback
    if (agents && agents.length > 0) {
      return agents;
    } else if (liveDataError && snapshotAgents && snapshotAgents.length > 0) {
      return snapshotAgents;
    }
    return [];
  }, [agents, liveDataError, snapshotAgents]);
  
  // Apply client-side filtering to reduce server load
  const filteredResults = useMemo(() => {
    if (!displayDataSource.length) return { filteredAgents: [], totalCount: 0 };
    return applyAllFilters(displayDataSource, filters);
  }, [displayDataSource, filters]);
  
  // Display data - this is now client-side filtered
  const displayAgents = filteredResults.filteredAgents || [];
  const totalAgentsCount = filteredResults.totalCount || 0;
  
  // Determine if we're in loading state - ensure boolean type
  const isLoading: boolean = agentsLoading || (liveDataError && snapshotAgentsLoading) ? true : false;
  
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
      
      <main className="flex flex-col">
        {/* Desktop layout */}
        <div className="hidden md:flex flex-row">
          <Sidebar 
            filters={filters}
            onFilterChange={handleFilterChange}
            cities={cities || []}
            isLoading={snapshotsLoading}
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
                <span className="text-gray-400 text-sm">
                  {agents ? 
                    `Showing ${displayAgents.length} of ${stats?.totalAgents || totalAgentsCount} Digital Twins` : 
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
                pageSize={filters.limit || 25}
                isLoading={isLoading}
              />
            )}
            
            {selectedView === 'cards' && (
              <LeaderboardCards 
                agents={displayAgents}
                onAgentSelect={handleAgentSelect}
                currentPage={filters.page || 1}
                onPageChange={handlePageChange}
                totalAgents={totalAgentsCount}
                pageSize={filters.limit || 25}
                isLoading={isLoading}
              />
            )}
            
            {selectedView === 'timeline' && (
              <LeaderboardTimeline 
                stats={stats} 
                isLoading={!stats || isLoading}
              />
            )}
            
            {/* City Statistics */}
            {displayDataSource.length > 0 && (
              <div className="mt-6">
                <CityStatistics 
                  agents={displayDataSource}
                  isLoading={isLoading}
                />
                
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile layout */}
        <div className="md:hidden flex flex-col">
          <Sidebar 
            filters={filters}
            onFilterChange={handleFilterChange}
            cities={cities || []}
            isLoading={snapshotsLoading}
          />
          
          <div className="p-3">
            <StatCards 
              stats={stats} 
              snapshotTime={currentSnapshot ? formatDate(currentSnapshot.timestamp) : ''}
              isLoading={!stats}
            />
            
            <div className="flex flex-col justify-between items-start mb-3 gap-1">
              <h2 className="text-lg font-bold">{viewTitle}</h2>
              <div>
                <span className="text-gray-400 text-xs">
                  {agents ? 
                    `Showing ${displayAgents.length} of ${stats?.totalAgents || totalAgentsCount} Digital Twins` : 
                    'Loading...'}
                </span>
              </div>
            </div>
            
            {selectedView === 'table' && (
              <div className="overflow-x-auto -mx-3">
                <LeaderboardTable 
                  agents={displayAgents}
                  onAgentSelect={handleAgentSelect}
                  currentPage={filters.page || 1}
                  onPageChange={handlePageChange}
                  totalAgents={totalAgentsCount}
                  pageSize={filters.limit || 25}
                  isLoading={isLoading}
                />
              </div>
            )}
            
            {selectedView === 'cards' && (
              <LeaderboardCards 
                agents={displayAgents}
                onAgentSelect={handleAgentSelect}
                currentPage={filters.page || 1}
                onPageChange={handlePageChange}
                totalAgents={totalAgentsCount}
                pageSize={filters.limit || 25}
                isLoading={isLoading}
              />
            )}
            
            {selectedView === 'timeline' && (
              <LeaderboardTimeline 
                stats={stats} 
                isLoading={!stats || isLoading}
              />
            )}
            
            {/* City Statistics for Mobile */}
            {displayDataSource.length > 0 && (
              <div className="mt-4">
                <CityStatistics 
                  agents={displayDataSource}
                  isLoading={isLoading}
                />
                
              </div>
            )}
          </div>
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