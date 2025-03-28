import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { LineChart, Earth, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import LeaderboardTable from '@/components/LeaderboardTable';
import StatCards from '@/components/StatCards';


import AgentDetailModal from '@/components/AgentDetailModal';
import { Agent, AgentFilters, Snapshot, SnapshotStats } from '@/types/agent';
import { formatDate } from '@/utils/formatters';
import { applyAllFilters } from '@/utils/FilterUtils';
import FreysaImage from '../assets/profile-freysa-original.jpg';

// Local storage key for saved agents
const MY_AGENTS_KEY = 'freysa-my-agents';

export default function Home() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AgentFilters>({
    page: 1,
    limit: 25,
    sortBy: 'score'
  });
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showMyAgentsOnly, setShowMyAgentsOnly] = useState(false);
  const [myAgents, setMyAgents] = useState<string[]>([]);
  const [firstLoadTime, setFirstLoadTime] = useState<string | null>(null);
  
  // Query available snapshots 
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery<Snapshot[]>({
    queryKey: ['/api/snapshots'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Get the latest snapshot ID from the snapshots array
  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
  // Don't set a default value initially to avoid 404 errors
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);
  
  // Update selected snapshot when snapshots data loads
  useEffect(() => {
    if (latestSnapshot) {
      setSelectedSnapshot(latestSnapshot.id);
    }
  }, [latestSnapshot]);
  
  // Load saved agents from localStorage
  useEffect(() => {
    try {
      const savedAgents = localStorage.getItem(MY_AGENTS_KEY);
      if (savedAgents) {
        setMyAgents(JSON.parse(savedAgents));
      }
    } catch (error) {
      console.error('Error loading saved agents:', error);
    }
  }, []);
  
  // Current snapshot object for display
  const currentSnapshot = latestSnapshot || {
    id: selectedSnapshot,
    timestamp: new Date().toISOString(),
    description: "Loading snapshot data..."
  };

  // Query agents with filters - always fetch fresh data to ensure up-to-date scores
  const { 
    data: agents, 
    isLoading: agentsLoading,
    refetch: refetchAgents,
    error: liveDataError
  } = useQuery<Agent[]>({
    queryKey: [
      `/api/agents`, 
      { 
        limit: 2000, // Get a larger batch once to reduce API calls
        sortBy: filters.sortBy, // Include current sort in the query key to trigger refetch when sort changes
        // Add a timestamp as part of the query key to force refresh on page load/refresh
        timestamp: Date.now()
      }
    ],
    queryFn: async ({ queryKey }) => {
      const [baseUrl, params] = queryKey;
      const queryParams = params as { limit: number, sortBy?: string };
      
      try {
        console.log('Fetching fresh leaderboard data');
        // Include sortBy in the API request to ensure server-side sorting
        const url = new URL(baseUrl as string, window.location.origin);
        url.searchParams.append('limit', '2000');
        if (queryParams.sortBy) {
          url.searchParams.append('sortBy', queryParams.sortBy);
        }
        // Add cache-busting parameter to prevent browser caching
        url.searchParams.append('_t', Date.now().toString());
        
        const response = await fetch(url.toString(), {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch live agents data');
        }
        
        const data = await response.json();
        
        // Update firstLoadTime state with the current time
        setFirstLoadTime(new Date().toISOString());
        
        return data as Agent[];
      } catch (error) {
        console.error('Error fetching live data, will attempt to use snapshot data', error);
        // We'll try fallback to the latest snapshot data
        throw error;
      }
    },
    staleTime: 0, // No stale time - always fetch fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
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
        limit: 2000,
        sortBy: filters.sortBy, // Pass sort to snapshot API call as well
        // Add a timestamp to force refresh on page load/refresh
        timestamp: Date.now()
      }
    ],
    // Custom query function to include the sort parameter in the API request
    queryFn: async ({ queryKey }) => {
      if (!selectedSnapshot) return [];
      
      const [baseUrl, params] = queryKey;
      const queryParams = params as { limit: number, sortBy?: string };
      
      // Build URL with parameters
      const url = new URL(baseUrl as string, window.location.origin);
      url.searchParams.append('limit', '2000');
      if (queryParams.sortBy) {
        url.searchParams.append('sortBy', queryParams.sortBy);
      }
      // Add cache busting parameter
      url.searchParams.append('_t', Date.now().toString());
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot agents data');
      }
      
      return await response.json();
    },
    // Only run this query if we have a valid snapshot ID AND either:
    // 1. The live data request failed with an error, OR
    // 2. The live data returned an empty array (API down but returns empty)
    enabled: !!selectedSnapshot && (!!liveDataError || (agents && agents.length === 0)),
    staleTime: 10 * 60 * 1000, // 10 minutes - snapshots change less frequently
    gcTime: 20 * 60 * 1000, // 20 minutes
  });

  // Query stats for the selected snapshot - always fetch fresh data
  const { data: stats } = useQuery<SnapshotStats | undefined>({
    queryKey: [
      `/api/snapshots/${selectedSnapshot}/stats`,
      { timestamp: Date.now() } // Add timestamp to force refresh on page load
    ],
    // Custom fetch function to avoid caching
    queryFn: async ({ queryKey }) => {
      if (!selectedSnapshot) return undefined;
      
      const [baseUrl] = queryKey;
      const url = new URL(baseUrl as string, window.location.origin);
      url.searchParams.append('_t', Date.now().toString());
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot stats');
      }
      
      return await response.json();
    },
    // Only run when we have a valid snapshot ID
    enabled: !!selectedSnapshot,
    staleTime: 0, // No stale time - always fetch fresh data
    gcTime: 10 * 60 * 1000, // Keep in memory longer
  });

  // Query cities for filter dropdown - optimized with memory cache
  const { data: cities } = useQuery<string[]>({
    queryKey: ['/api/cities'],
    staleTime: 60 * 60 * 1000, // 1 hour - cities change very rarely
    gcTime: 120 * 60 * 1000 // 2 hours
  });

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<AgentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 when filters change
  };
  
  // Handle toggling between My Agents and All Agents view
  const handleToggleMyAgents = () => {
    const newState = !showMyAgentsOnly;
    console.log(`Toggling My Agents view: ${showMyAgentsOnly} -> ${newState}`);
    
    // Update the state
    setShowMyAgentsOnly(newState);
    
    // If turning on my agents view, make sure we have saved data
    if (newState && myAgents.length > 0) {
      console.log(`Will show only ${myAgents.length} saved agents`);
    } else {
      console.log('Showing all agents');
    }
    
    // Reset to page 1 when switching views
    setFilters(prev => ({ ...prev, page: 1 }));
  };
  
  // Handle toggling save/unsave agent
  const handleToggleSaveAgent = (username: string) => {
    // Calculate the new list of saved agents - using a callback to ensure we work with latest state
    const isCurrentlySaved = myAgents.includes(username);
    
    if (isCurrentlySaved) {
      // Remove from saved agents
      setMyAgents(prev => {
        const updated = prev.filter(agent => agent !== username);
        // Update localStorage with new list inside the callback
        localStorage.setItem(MY_AGENTS_KEY, JSON.stringify(updated));
        return updated;
      });
      
      toast({
        title: 'Agent Removed',
        description: `${username} has been removed from your saved agents.`
      });
    } else {
      // Add to saved agents
      setMyAgents(prev => {
        const updated = [...prev, username];
        // Update localStorage with new list inside the callback
        localStorage.setItem(MY_AGENTS_KEY, JSON.stringify(updated));
        return updated;
      });
      
      toast({
        title: 'Agent Saved',
        description: `${username} has been added to your saved agents.`
      });
    }
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

  // Set fixed title for the leaderboard
  const viewTitle = 'Leaderboard Rankings';

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
    
    // Also invalidate stats if we have a valid selected snapshot
    if (selectedSnapshot !== null) {
      console.log(`Refreshing snapshot #${selectedSnapshot} stats`);
      queryClient.invalidateQueries({ 
        queryKey: [`/api/snapshots/${selectedSnapshot}/stats`] 
      });
    } else {
      console.log('No valid snapshot selected, skipping snapshot stats refresh');
    }
    
    // Invalidate cities list
    queryClient.invalidateQueries({ 
      queryKey: [`/api/cities`] 
    });
  }, [selectedSnapshot, queryClient]);
  
  // Show a toast notification when falling back to snapshot data
  useEffect(() => {
    // Show notification when we're using snapshot data as fallback, either due to explicit error
    // or because the API returned empty data
    if (((liveDataError || (agents && agents.length === 0)) && snapshotAgents && snapshotAgents.length > 0) &&
        // Only show the toast if we have agents but they're empty
        (!agents || agents.length === 0)) {
      toast({
        title: "Using snapshot data",
        description: "Live data is currently unavailable. Showing latest snapshot data instead.",
        variant: "default"
      });
    }
  }, [liveDataError, agents, snapshotAgents, toast]);
  
  // Determine which data source to use - live data or snapshot fallback
  const displayDataSource = useMemo(() => {
    // Use live data if available and not empty
    if (agents && agents.length > 0) {
      return agents;
    } 
    // Use snapshot data as fallback if:
    // 1. There was an explicit API error, OR
    // 2. The live data returned empty but we have snapshot data available
    else if ((liveDataError || (agents && agents.length === 0)) && snapshotAgents && snapshotAgents.length > 0) {
      return snapshotAgents;
    }
    return [];
  }, [agents, liveDataError, snapshotAgents]);
  
  // Apply client-side filtering to reduce server load
  const filteredResults = useMemo(() => {
    // Handle empty data case
    if (!displayDataSource.length) return { filteredAgents: [], totalCount: 0 };
    
    // Debugging to check our data source and my agents list
    console.log(`Starting filtering with ${displayDataSource.length} agents`);
    console.log(`My saved agents: ${myAgents.length > 0 ? myAgents.join(', ') : 'none'}`);
    
    // First check if we should filter to only show my agents
    let dataToFilter = [...displayDataSource];
    
    if (showMyAgentsOnly && myAgents.length > 0) {
      console.log(`Filtering to show only ${myAgents.length} saved agents`);
      
      // Pre-filter to only include my agents
      dataToFilter = displayDataSource.filter(agent => 
        myAgents.includes(agent.mastodonUsername)
      );
      
      console.log(`Found ${dataToFilter.length} matching agents from my list`);
      
      // If no matches found, return empty result
      if (dataToFilter.length === 0) {
        return { filteredAgents: [], totalCount: 0 };
      }
    }
    
    // Then apply the regular filters to the pre-filtered data
    const filtered = applyAllFilters(dataToFilter, filters);
    
    return filtered;
  }, [displayDataSource, filters, showMyAgentsOnly, myAgents]);
  
  // Display data - this is now client-side filtered
  const displayAgents = filteredResults.filteredAgents || [];
  const totalAgentsCount = filteredResults.totalCount || 0;
  
  // Determine if we're in loading state - ensure boolean type
  const isLoading: boolean = 
    // Regular loading from live API
    agentsLoading || 
    // Loading from fallback when live API explicitly failed
    (liveDataError && snapshotAgentsLoading) ||
    // Loading from fallback when live API returned empty
    (agents && agents.length === 0 && snapshotAgentsLoading)
    ? true : false;
  
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
    
    // Initialize firstLoadTime on component mount if it's not set
    if (!firstLoadTime) {
      setFirstLoadTime(new Date().toISOString());
      console.log("First load - forcing data refresh");
      refreshData();
    }
    
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
      <div className="bg-gray-900 border-b border-gray-800 py-4 sticky top-0 z-10 w-full">
        <div className="app-container px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-3 sm:mb-0">
            <a 
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-primary border-2 border-primary ring-2 ring-green-500 glow animate-pulse-green flex-shrink-0">
                <img 
                  src={FreysaImage}
                  alt="Freysa" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent truncate">
                Freysa Digital Twin Leaderboard
              </h1>
            </a>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end">
            <Link to="/my-agents">
              <Button 
                variant="outline" 
                size="sm"
                className="border-emerald-800 hover:bg-emerald-900/30 text-emerald-400 flex items-center gap-1"
              >
                <Users className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">My Agents</span>
                <span className="sm:hidden">Agents</span>
              </Button>
            </Link>
            
            <Link to="/analytics">
              <Button 
                variant="outline" 
                size="sm"
                className="border-emerald-800 hover:bg-emerald-900/30 text-emerald-400 flex items-center gap-1"
              >
                <LineChart className="h-4 w-4 mr-1" />
                <span>Analytics</span>
              </Button>
            </Link>
            
            <Link to="/city-stats">
              <Button 
                variant="outline" 
                size="sm"
                className="border-emerald-800 hover:bg-emerald-900/30 text-emerald-400 flex items-center gap-1"
              >
                <Earth className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">City Stats</span>
                <span className="sm:hidden">Cities</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <main className="flex flex-col app-container w-full">
        {/* Desktop layout */}
        <div className="hidden md:flex flex-row">
          <div className="w-80 flex-shrink-0 max-h-[calc(100vh-70px)] sticky top-[70px] overflow-y-auto">
            <Sidebar 
              filters={filters}
              onFilterChange={handleFilterChange}
              cities={cities || []}
              isLoading={snapshotsLoading}
              showMyAgents={showMyAgentsOnly}
              onToggleMyAgents={handleToggleMyAgents}
              myAgents={myAgents}
            />
          </div>
          
          <div className="flex-grow p-4 overflow-x-auto">
            <div className="mb-6">
              <StatCards 
                stats={stats} 
                snapshotTime={currentSnapshot ? formatDate(currentSnapshot.timestamp) : ''}
                firstLoadTime={firstLoadTime}
                isLoading={!stats}
              />
            </div>
            
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
            
            <div className="overflow-x-auto">
              <LeaderboardTable 
                agents={displayAgents}
                onAgentSelect={handleAgentSelect}
                currentPage={filters.page || 1}
                onPageChange={handlePageChange}
                totalAgents={totalAgentsCount}
                pageSize={filters.limit || 25}
                isLoading={isLoading}
                savedAgents={myAgents}
                onToggleSaveAgent={handleToggleSaveAgent}
              />
            </div>
          </div>
        </div>
        
        {/* Mobile layout - optimized for better spacing */}
        <div className="md:hidden flex flex-col px-3">
          <div className="py-3">
            <StatCards 
              stats={stats} 
              snapshotTime={currentSnapshot ? formatDate(currentSnapshot.timestamp) : ''}
              firstLoadTime={firstLoadTime}
              isLoading={!stats}
            />
          </div>
          
          <Sidebar 
            filters={filters}
            onFilterChange={handleFilterChange}
            cities={cities || []}
            isLoading={snapshotsLoading}
            showMyAgents={showMyAgentsOnly}
            onToggleMyAgents={handleToggleMyAgents}
            myAgents={myAgents}
          />
          
          <div className="py-3">
            <div className="flex flex-col justify-between items-start mb-4 gap-1">
              <h2 className="text-lg font-bold">{viewTitle}</h2>
              <div>
                <span className="text-gray-400 text-xs">
                  {agents ? 
                    `Showing ${displayAgents.length} of ${stats?.totalAgents || totalAgentsCount} Digital Twins` : 
                    'Loading...'}
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-3 px-3">
              <div className="min-w-full">
                <LeaderboardTable 
                  agents={displayAgents}
                  onAgentSelect={handleAgentSelect}
                  currentPage={filters.page || 1}
                  onPageChange={handlePageChange}
                  totalAgents={totalAgentsCount}
                  pageSize={filters.limit || 25}
                  isLoading={isLoading}
                  savedAgents={myAgents}
                  onToggleSaveAgent={handleToggleSaveAgent}
                />
              </div>
            </div>
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