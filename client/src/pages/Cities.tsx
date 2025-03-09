import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import CityStatistics from '@/components/CityStatistics';
import { Agent } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';

export default function Cities() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  
  // Fetch agents data
  const { data: agentsData, isLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Query cities for filter dropdown
  const { data: cities } = useQuery<string[]>({
    queryKey: ['/api/cities'],
    staleTime: 60 * 60 * 1000, // 1 hour - cities change very rarely
  });
  
  // Update local state when data loads
  useEffect(() => {
    if (agentsData) {
      setAgents(agentsData);
    }
  }, [agentsData]);

  // Filter agents by city if one is selected
  const filteredAgents = useMemo(() => {
    if (!selectedCity) return agents;
    return agents.filter(agent => agent.city === selectedCity);
  }, [agents, selectedCity]);

  // Calculate city-specific stats when a city is selected
  const cityStats = useMemo(() => {
    if (!selectedCity || !filteredAgents.length) return null;
    
    const totalScore = filteredAgents.reduce((sum: number, agent: Agent) => sum + agent.score, 0);
    const avgScore = totalScore / filteredAgents.length;
    const topAgent = [...filteredAgents].sort((a, b) => b.score - a.score)[0];
    
    return {
      name: selectedCity,
      count: filteredAgents.length,
      avgScore,
      totalScore,
      topAgent
    };
  }, [filteredAgents, selectedCity]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(prev => prev === city ? null : city);
  };

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
        
        {cities && cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {cities.map(city => (
              <Button
                key={city}
                variant={selectedCity === city ? "default" : "outline"} 
                size="sm"
                onClick={() => handleCitySelect(city)}
                className={selectedCity === city ? "bg-primary" : "border-primary/40"}
              >
                {city}
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedCity && cityStats && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold mb-3">{selectedCity} Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-lg p-3 border border-primary/30">
              <div className="text-sm text-gray-400 mb-1">Total Agents</div>
              <div className="text-2xl font-bold">{cityStats.count}</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 border border-primary/30">
              <div className="text-sm text-gray-400 mb-1">Average Score</div>
              <div className="text-2xl font-bold">{Math.round(cityStats.avgScore).toLocaleString()}</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 border border-primary/30">
              <div className="text-sm text-gray-400 mb-1">Top Agent</div>
              <div className="text-xl font-medium truncate">{cityStats.topAgent?.mastodonUsername}</div>
              <div className="text-sm text-primary">{cityStats.topAgent?.score.toLocaleString()} points</div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="w-full">
          <Skeleton className="h-80 w-full mb-4" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <div className={selectedCity ? "opacity-50" : ""}>
          <h2 className="text-xl font-bold mb-3">Global City Distribution</h2>
          <CityStatistics 
            agents={agents}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}