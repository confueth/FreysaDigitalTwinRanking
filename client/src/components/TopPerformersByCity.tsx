import React, { useMemo, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatCompactNumber } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { Agent } from '@/types/agent';
import { ChevronDownIcon, MapPinIcon } from 'lucide-react';

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

  // Find the currently selected city data
  const selectedCityData = cityData.find(item => item.city === selectedCity);

  // Handle city selection change
  const handleCityChange = (value: string) => {
    setSelectedCity(value);
  };

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Top Performers By City</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select 
            value={selectedCity || undefined} 
            onValueChange={handleCityChange}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a city">
                {selectedCity && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-emerald-400" />
                    <span>{formatCityName(selectedCity || '')}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600 text-white">
              {cityData.map(({ city, totalAgents }) => (
                <SelectItem 
                  key={city} 
                  value={city}
                  className="focus:bg-emerald-600 focus:text-white hover:bg-gray-600"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{formatCityName(city)}</span>
                    
                    <span className="text-xs text-emerald-400">
                      {totalAgents} {totalAgents === 1 ? 'Agent' : 'Agents'}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedCityData && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
              <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                {formatCityName(selectedCityData.city)}
              </h3>
              <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500 hover:bg-emerald-600/30">
                {selectedCityData.totalAgents} {selectedCityData.totalAgents === 1 ? 'Agent' : 'Agents'}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {selectedCityData.agents.map((agent, index) => (
                <div 
                  key={agent.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-700/80 hover:bg-gray-600 cursor-pointer transition-colors border border-gray-600 hover:border-emerald-500 shadow-sm hover:shadow-md"
                  onClick={() => handleAgentClick(agent.mastodonUsername)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-white font-bold text-xs ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-700' : 
                      'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-gray-600">
                      <AvatarImage src={agent.avatarUrl || ''} alt={agent.mastodonUsername} />
                      <AvatarFallback className="bg-gray-600 text-gray-100 font-semibold">
                        {agent.mastodonUsername.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-white truncate">
                        {agent.mastodonUsername}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-300">
                        {agent.followersCount !== undefined && (
                          <span>{formatCompactNumber(agent.followersCount)} followers</span>
                        )}
                        {agent.likesCount !== undefined && (
                          <span>• {formatCompactNumber(agent.likesCount)} likes</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">
                      {formatNumber(agent.score)}
                    </p>
                    <p className="text-xs text-gray-300">
                      Global Rank #{agent.rank}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <div className="mb-6">
          <Skeleton className="h-10 w-full bg-gray-700 rounded-md" />
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center pb-2">
            <Skeleton className="h-6 w-32 bg-gray-700" />
            <Skeleton className="h-6 w-20 bg-gray-700 rounded-full" />
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-600 bg-gray-700/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-7 w-7 rounded-full bg-gray-600" />
                  <Skeleton className="h-10 w-10 rounded-full bg-gray-600" />
                  <div>
                    <Skeleton className="h-4 w-28 bg-gray-600 mb-1" />
                    <Skeleton className="h-3 w-20 bg-gray-600" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 bg-gray-600 mb-1" />
                  <Skeleton className="h-3 w-14 bg-gray-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default memo(TopPerformersByCity);