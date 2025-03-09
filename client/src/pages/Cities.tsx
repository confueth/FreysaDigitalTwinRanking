import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import CityStatistics from '@/components/CityStatistics';
import { Agent } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';

export default function Cities() {
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Fetch agents data
  const { data: agentsData, isLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Update local state when data loads
  useEffect(() => {
    if (agentsData) {
      setAgents(agentsData);
    }
  }, [agentsData]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Leaderboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">City Statistics</h1>
        </div>
      </div>
      
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <p className="text-gray-300 mb-4">
          Explore how Digital Twins are distributed across different cities. This data provides insights into the geographic spread of the Freysa ecosystem and helps identify emerging hubs of activity.
        </p>
      </div>

      {isLoading ? (
        <div className="w-full">
          <Skeleton className="h-80 w-full mb-4" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <CityStatistics 
          agents={agents}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}