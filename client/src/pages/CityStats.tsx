import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from '@/types/agent';
import CityStatistics from '@/components/CityStatistics';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Home } from 'lucide-react';

export default function CityStats() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query agents with filters - use live data
  const { 
    data: agents, 
    isLoading,
    refetch
  } = useQuery<Agent[]>({
    queryKey: [`/api/agents`, { limit: 2000 }],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Data Refreshed",
        description: "City statistics have been updated with the latest data.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "There was an error refreshing the data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">City Statistics</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 hover:bg-gray-700 border-gray-700"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Link to="/">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-gray-400 mb-6">
        View agent distribution and statistics by city. The charts show how Digital Twins are distributed across different cities
        and their average scores per location.
      </p>

      <div className="grid grid-cols-1 gap-6">
        {agents && agents.length > 0 ? (
          <CityStatistics 
            agents={agents}
            isLoading={isLoading}
          />
        ) : (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              {isLoading ? 'Loading city statistics...' : 'No city data available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}