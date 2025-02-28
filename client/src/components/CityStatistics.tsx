import React, { useMemo } from 'react';
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
}

// Generate colors for cities
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

const CityStatistics: React.FC<CityStatisticsProps> = ({ agents, isLoading }) => {
  const isMobile = useIsMobile();

  // Process city data for visualization
  const cityData = useMemo(() => {
    if (!agents?.length) return [];

    // Group data by city
    const cityGroups = agents.reduce((acc, agent) => {
      const city = agent.city || 'Unknown';
      if (!acc[city]) {
        acc[city] = {
          agents: [],
          totalScore: 0,
        };
      }
      acc[city].agents.push(agent);
      acc[city].totalScore += agent.score || 0;
      return acc;
    }, {} as Record<string, { agents: Agent[], totalScore: number }>);

    // Transform grouped data into chart data
    return Object.entries(cityGroups)
      .map(([city, data], index) => ({
        city,
        count: data.agents.length,
        avgScore: Math.round(data.totalScore / data.agents.length),
        totalScore: data.totalScore,
        color: CITY_COLORS[index % CITY_COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [agents]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-md p-3 shadow-md">
          <p className="text-gray-300 text-sm font-medium">{payload[0].payload.city}</p>
          <p className="text-sm">
            <span className="text-gray-400">Agents:</span> <span className="font-semibold">{formatNumber(payload[0].payload.count)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Avg Score:</span> <span className="font-semibold">{formatNumber(payload[0].payload.avgScore)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Total Score:</span> <span className="font-semibold">{formatNumber(payload[0].payload.totalScore)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-md p-3 shadow-md">
          <p className="text-gray-300 text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm">
            <span className="text-gray-400">Agents:</span> <span className="font-semibold">{formatNumber(payload[0].value)}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Percentage:</span> <span className="font-semibold">
              {((payload[0].value / agents.length) * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-200">City Statistics</h3>
      
      <Tabs defaultValue="bar" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bar" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cityData}
              margin={{ top: 5, right: 20, left: isMobile ? 0 : 20, bottom: 5 }}
            >
              <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
              <XAxis 
                dataKey="city" 
                stroke="#9CA3AF" 
                fontSize={12} 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value: string): string => {
                  if (value === 'Unknown') return value;
                  if (isMobile) {
                    // Shorten city names on mobile
                    return value.split('_').map((part: string): string => part.charAt(0)).join('');
                  }
                  return value.replace('_', ' ');
                }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => formatCompactNumber(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Agents">
                {cityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
        
        <TabsContent value="pie" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cityData}
                cx="50%"
                cy="50%"
                labelLine={!isMobile}
                outerRadius={isMobile ? 80 : 100}
                dataKey="count"
                nameKey="city"
                label={isMobile ? false : entry => entry.city.replace('_', ' ')}
              >
                {cityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip />} />
              <Legend formatter={(value) => value.replace('_', ' ')} />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatisticsSkeleton: React.FC = () => {
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
};

export default CityStatistics;