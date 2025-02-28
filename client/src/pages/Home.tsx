import { useState, useEffect } from 'react';
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

type ViewMode = 'table' | 'cards' | 'timeline';

export default function Home() {
  const [selectedView, setSelectedView] = useState<ViewMode>('table');
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);
  const [filters, setFilters] = useState<AgentFilters>({
    page: 1,
    limit: 50,
    sortBy: 'score'
  });
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);

  // Query snapshots
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['/api/snapshots'],
    staleTime: 60000 // 1 minute
  });

  // Query latest snapshot if none selected
  const { data: latestSnapshot } = useQuery({
    queryKey: ['/api/snapshots/latest'],
    enabled: !selectedSnapshot,
    staleTime: 60000 // 1 minute
  });

  // Set the initial snapshot ID when data is loaded
  useEffect(() => {
    if (!selectedSnapshot && latestSnapshot) {
      setSelectedSnapshot(latestSnapshot.id);
    }
  }, [selectedSnapshot, latestSnapshot]);

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

  // Handle snapshot change
  const handleSnapshotChange = (snapshotId: number) => {
    setSelectedSnapshot(snapshotId);
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

  // Get current snapshot from list
  const currentSnapshot = snapshots?.find((s: Snapshot) => s.id === selectedSnapshot);
  
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

  // Poll for new snapshots every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/snapshots'] });
      if (selectedSnapshot) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/snapshots/${selectedSnapshot}/agents`] 
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [selectedSnapshot]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header 
        selectedView={selectedView}
        onViewChange={handleViewChange}
      />
      
      <main className="flex-grow flex flex-col md:flex-row">
        <Sidebar 
          snapshots={snapshots || []} 
          selectedSnapshot={selectedSnapshot}
          onSnapshotChange={handleSnapshotChange}
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
              <span className="text-gray-400">
                {agents ? `Showing ${agents.length} of ${stats?.totalAgents || '?'} agents` : 'Loading...'}
              </span>
            </div>
          </div>
          
          {selectedView === 'table' && (
            <LeaderboardTable 
              agents={agents || []}
              onAgentSelect={handleAgentSelect}
              currentPage={filters.page || 1}
              onPageChange={handlePageChange}
              totalAgents={stats?.totalAgents || 0}
              pageSize={filters.limit || 50}
              isLoading={agentsLoading}
            />
          )}
          
          {selectedView === 'cards' && (
            <LeaderboardCards 
              agents={agents || []}
              onAgentSelect={handleAgentSelect}
              currentPage={filters.page || 1}
              onPageChange={handlePageChange}
              totalAgents={stats?.totalAgents || 0}
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
