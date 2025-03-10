import React, { useMemo, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatCompactNumber } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { Agent } from '@/types/agent';

interface TopPerformersByCityProps {
  agents: Agent[];
  isLoading: boolean;
  onAgentSelect?: (username: string) => void;
}

const TopPerformersByCity: React.FC<TopPerformersByCityProps> = ({ 
  agents, 
  isLoading, 
  onAgentSelect 
}) => {
  const isMobile = useIsMobile();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Process city data and top performers for each city
  const cityData = useMemo(() => {
    if (!agents?.length) return [];
    
    // Group agents by city
    const cityMap = new Map<string, Agent[]>();
    
    for (const agent of agents) {
      const city = agent.city || 'Unknown';
      if (!cityMap.has(city)) {
        cityMap.set(city, []);
      }
      cityMap.get(city)?.push(agent);
    }
    
    // Sort agents within each city by score
    cityMap.forEach((cityAgents, city) => {
      cityAgents.sort((a, b) => b.score - a.score);
    });
    
    // Transform to array and sort cities by number of top performers
    const result = Array.from(cityMap.entries()).map(([city, cityAgents]) => ({
      city,
      agents: cityAgents.slice(0, 5), // Keep only top 5 performers
      totalAgents: cityAgents.length
    }));
    
    // Sort by total agent count (cities with most agents first)
    result.sort((a, b) => b.totalAgents - a.totalAgents);
    
    // Take only top 6 cities (or fewer if there aren't that many)
    return result.slice(0, 6);
  }, [agents]);

  // Set initial selected city when data loads
  useMemo(() => {
    if (cityData.length > 0 && !selectedCity) {
      setSelectedCity(cityData[0].city);
    }
  }, [cityData, selectedCity]);

  // Handle agent click
  const handleAgentClick = (username: string) => {
    if (onAgentSelect) {
      onAgentSelect(username);
    }
  };

  // Format city name for display
  const formatCityName = (city: string): string => {
    if (city === 'Unknown') return city;
    return city.replace('_', ' ');
  };

  if (isLoading) {
    return <TopPerformersSkeletonLoader />;
  }

  if (cityData.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Top Performers By City</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-6">No city data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Top Performers By City</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={selectedCity || undefined} onValueChange={setSelectedCity} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 overflow-x-auto sm:grid-cols-6">
            {cityData.map(({ city }) => (
              <TabsTrigger 
                key={city} 
                value={city}
                className="text-xs sm:text-sm px-2 py-1"
              >
                {isMobile ? formatCityName(city).substring(0, 3) : formatCityName(city)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {cityData.map(({ city, agents: cityAgents, totalAgents }) => (
            <TabsContent key={city} value={city} className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-gray-300">
                  {formatCityName(city)}
                </h3>
                <Badge variant="outline" className="bg-gray-700 text-gray-300">
                  {totalAgents} {totalAgents === 1 ? 'Agent' : 'Agents'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {cityAgents.map((agent, index) => (
                  <div 
                    key={agent.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => handleAgentClick(agent.mastodonUsername)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 text-gray-400 font-semibold w-6 text-center">
                        #{index + 1}
                      </div>
                      <Avatar className="h-8 w-8 border border-gray-600">
                        <AvatarImage src={agent.avatarUrl || ''} alt={agent.mastodonUsername} />
                        <AvatarFallback className="bg-gray-600 text-gray-300">
                          {agent.mastodonUsername.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {agent.mastodonUsername}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          {agent.followersCount !== undefined && (
                            <span>{formatCompactNumber(agent.followersCount)} followers</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">
                        {formatNumber(agent.score)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Rank #{agent.rank}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Memoized skeleton loader
const TopPerformersSkeletonLoader = memo(() => {
  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <Skeleton className="h-7 w-48 bg-gray-700" />
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-6 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-20 bg-gray-700 rounded-md mr-2" />
          ))}
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full bg-gray-700 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default memo(TopPerformersByCity);