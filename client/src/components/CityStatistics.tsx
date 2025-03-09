import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { formatCompactNumber, formatNumber } from '@/utils/formatters';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Agent } from '@/types/agent';

interface CityStatisticsProps {
  agents: Agent[];
  isLoading: boolean;
}

interface CityData {
  city: string;
  count: number;
  avgScore: number;
  totalScore: number;
  color: string;
  percentage?: number;
}

// Pre-define colors for performance
const CITY_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#A78BFA', // Violet
];

// Extract color generation to a memoized function for better performance
const getColorForIndex = (index: number): string => {
  return CITY_COLORS[index % CITY_COLORS.length];
};

// Memoized tooltips to prevent unnecessary rerenders
const CustomTooltip = memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-md p-3 shadow-md">
        <p className="text-gray-300 text-sm font-medium">{data.city.replace('_', ' ')}</p>
        <p className="text-sm">
          <span className="text-gray-400">Agents:</span> <span className="font-semibold">{formatNumber(data.count)}</span>
        </p>
        <p className="text-sm">
          <span className="text-gray-400">Avg Score:</span> <span className="font-semibold">{formatNumber(data.avgScore)}</span>
        </p>
        <p className="text-sm">
          <span className="text-gray-400">Total Score:</span> <span className="font-semibold">{formatNumber(data.totalScore)}</span>
        </p>
      </div>
    );
  }
  return null;
});

const PieCustomTooltip = memo(({ active, payload, totalAgents }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-md p-3 shadow-md">
        <p className="text-gray-300 text-sm font-medium">{data.name.replace('_', ' ')}</p>
        <p className="text-sm">
          <span className="text-gray-400">Agents:</span> <span className="font-semibold">{formatNumber(data.value)}</span>
        </p>
        <p className="text-sm">
          <span className="text-gray-400">Percentage:</span> <span className="font-semibold">
            {data.payload.percentage?.toFixed(1) || ((data.value / totalAgents) * 100).toFixed(1)}%
          </span>
        </p>
      </div>
    );
  }
  return null;
});

// Memoized formatter functions
const formatCityName = (value: string, isMobile: boolean): string => {
  if (value === 'Unknown') return value;
  if (isMobile) {
    // Shorten city names on mobile
    return value.split('_').map((part: string): string => part.charAt(0)).join('');
  }
  return value.replace('_', ' ');
};

const CityStatistics: React.FC<CityStatisticsProps> = ({ agents, isLoading }) => {
  const [activeTab, setActiveTab] = useState('bar');
  const isMobile = useIsMobile();
  
  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  // Highly optimized city data calculation
  const cityData = useMemo(() => {
    if (!agents?.length) return [];
    
    const totalAgents = agents.length;
    console.log(`Processing ${totalAgents} agents for city statistics`);
    
    // Use Map for better performance on large datasets
    const cityMap = new Map<string, { count: number; totalScore: number }>();
    
    // Count agents with city data
    let agentsWithCityData = 0;
    
    // Single loop through agents (more efficient than reduce)
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      // Normalize city data to handle null, undefined, and empty strings
      let city = 'Unknown';
      if (agent.city) {
        city = agent.city;
        agentsWithCityData++;
      }
      
      const existing = cityMap.get(city);
      if (existing) {
        existing.count++;
        existing.totalScore += agent.score || 0;
      } else {
        cityMap.set(city, {
          count: 1,
          totalScore: agent.score || 0
        });
      }
    }
    
    console.log(`Found ${agentsWithCityData} agents with city data (${(agentsWithCityData/totalAgents*100).toFixed(1)}%)`);
    console.log(`Found ${cityMap.size} unique cities`);
    
    // Pre-allocate array size for performance
    const result: CityData[] = new Array(cityMap.size);
    let index = 0;
    
    // Transform map to array (faster than Array.from with mapping)
    cityMap.forEach((data, city) => {
      result[index++] = {
        city,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
        totalScore: data.totalScore,
        color: getColorForIndex(index - 1),
        percentage: (data.count / totalAgents) * 100
      };
    });
    
    // Sort by count (most common first)
    result.sort((a, b) => b.count - a.count);
    
    // Limit to top 10 cities for performance
    return result.slice(0, 10);
  }, [agents]);

  // Create memoized formatter functions
  const tickFormatter = useCallback((value: string): string => {
    return formatCityName(value, isMobile);
  }, [isMobile]);
  
  const valueFormatter = useCallback((value: number): string => {
    return formatCompactNumber(value);
  }, []);
  
  const legendFormatter = useCallback((value: string): string => {
    return value.replace('_', ' ');
  }, []);

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  if (!cityData.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">No city data available</p>
      </div>
    );
  }

  // Memoized cell renderer - use index as key for better reconciliation
  const renderCell = (entry: CityData, index: number) => (
    <Cell key={`cell-${index}`} fill={entry.color} />
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-200">City Statistics</h3>
      
      <Tabs defaultValue="bar" value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bar" className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
            <BarChart
              data={cityData}
              margin={{ top: 5, right: 20, left: isMobile ? 0 : 20, bottom: 5 }}
              width={500}
              height={300}
            >
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
              <XAxis 
                dataKey="city" 
                stroke="#9CA3AF" 
                fontSize={12} 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={tickFormatter}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={valueFormatter}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Agents">
                {cityData.map(renderCell)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="pie" className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
            <PieChart width={500} height={300}>
              <Pie
                data={cityData}
                cx="50%"
                cy="50%"
                labelLine={!isMobile}
                outerRadius={isMobile ? 80 : 100}
                dataKey="count"
                nameKey="city"
                label={isMobile ? false : (entry) => formatCityName(entry.city, false)}
              >
                {cityData.map(renderCell)}
              </Pie>
              <Tooltip content={<PieCustomTooltip totalAgents={agents.length} />} />
              <Legend formatter={legendFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Memoized skeleton to prevent rerenders
const StatisticsSkeleton = memo(() => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <Skeleton className="h-6 w-32 mb-4 bg-gray-700" />
      <div className="flex justify-center mb-4">
        <Skeleton className="h-8 w-48 bg-gray-700 rounded-lg" />
      </div>
      <div className="h-72 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-[90%] w-[95%] bg-gray-700" />
        </div>
      </div>
    </div>
  );
});

// Export memoized component for better performance
export default memo(CityStatistics);