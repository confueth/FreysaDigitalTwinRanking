import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatDate, formatNumber } from '@/utils/formatters';
import { Agent } from '@/types/agent';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface AgentPerformanceChartProps {
  agentHistory: Agent[];
  isLoading: boolean;
  color?: string;
}

const AgentPerformanceChart: React.FC<AgentPerformanceChartProps> = ({
  agentHistory,
  isLoading,
  color = "#10b981"
}) => {
  const isMobile = useIsMobile();
  
  // Process and sort data for the chart
  const chartData = useMemo(() => {
    if (!agentHistory?.length) return [];
    
    // Sort data chronologically
    return [...agentHistory]
      .sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateA - dateB;
      })
      .map(item => ({
        date: item.timestamp ? formatDate(item.timestamp) : 'Unknown',
        score: item.score,
        followers: item.followersCount || 0,
        likes: item.likesCount || 0,
        retweets: item.retweetsCount || 0,
        timestamp: item.timestamp
      }));
  }, [agentHistory]);

  // Calculate min and max score with buffer for better visualization
  const { minScore, maxScore } = useMemo(() => {
    if (!chartData.length) return { minScore: 0, maxScore: 1000 };
    
    const scores = chartData.map(item => item.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const buffer = (max - min) * 0.1;
    
    return {
      minScore: Math.max(0, min - buffer),
      maxScore: max + buffer
    };
  }, [chartData]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!chartData.length) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">No historical data available</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-md p-3 shadow-md">
          <p className="text-gray-300 text-sm font-medium">{label}</p>
          <p className="text-emerald-500 text-sm">
            Score: {formatNumber(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-blue-500 text-sm">
              Followers: {formatNumber(payload[1].value)}
            </p>
          )}
          {payload[2] && (
            <p className="text-pink-500 text-sm">
              Likes: {formatNumber(payload[2].value)}
            </p>
          )}
          {payload[3] && (
            <p className="text-amber-500 text-sm">
              Retweets: {formatNumber(payload[3].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-200">Performance History</h3>
      <div className="h-72 w-full" style={{ minHeight: '250px', minWidth: '300px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
          <LineChart
            data={chartData}
            width={500}
            height={300}
            margin={{ top: 5, right: 20, left: isMobile ? 0 : 20, bottom: 5 }}
          >
            <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF" 
              fontSize={12} 
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(value) => {
                // For mobile, show shorter date format
                if (isMobile) {
                  const date = new Date(value);
                  return `${date.getMonth()+1}/${date.getDate()}`;
                }
                return value;
              }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              tick={{ fill: '#9CA3AF' }}
              domain={[minScore, maxScore]}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color }}
              activeDot={{ r: 6 }}
              name="Score"
            />
            <Line
              type="monotone"
              dataKey="followers"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#3b82f6" }}
              name="Followers"
            />
            <Line
              type="monotone"
              dataKey="likes"
              stroke="#ec4899"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#ec4899" }}
              name="Likes"
            />
            <Line
              type="monotone"
              dataKey="retweets"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={{ r: 3, fill: "#f59e0b" }}
              name="Retweets"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <Skeleton className="h-6 w-36 mb-4 bg-gray-700" />
      <div className="h-72 w-full flex flex-col justify-between" style={{ minHeight: '250px', minWidth: '300px' }}>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-[80%] w-[95%] bg-gray-700" />
        </div>
        <div className="h-6 flex justify-between mt-2">
          <Skeleton className="h-4 w-16 bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-700" />
          <Skeleton className="h-4 w-16 bg-gray-700" />
        </div>
      </div>
    </div>
  );
};

export default AgentPerformanceChart;