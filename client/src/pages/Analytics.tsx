import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Home } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Agent } from '@/types/agent';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatDate } from '@/utils/formatters';

interface AnalyticsProps {}

const CHART_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f97316", // Orange
  "#8b5cf6", // Violet
  "#ec4899", // Pink
];

export default function Analytics({}: AnalyticsProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [metric, setMetric] = useState<'score' | 'followers' | 'likes' | 'retweets'>('score');
  
  // Fetch top agents for selection
  const { data: topAgents, isLoading: isLoadingTopAgents } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents?sortBy=score&limit=100');
      if (!response.ok) throw new Error('Failed to fetch top agents');
      return response.json();
    }
  });
  
  // Fetch history data for selected agents
  const { data: agentHistories, isLoading: isLoadingHistories } = useQuery({
    queryKey: ['/api/agents/history', selectedAgents],
    queryFn: async () => {
      if (selectedAgents.length === 0) return {};
      
      const results: Record<string, Agent[]> = {};
      
      await Promise.all(
        selectedAgents.map(async (username) => {
          const response = await fetch(`/api/agents/${username}/history`);
          if (!response.ok) throw new Error(`Failed to fetch history for ${username}`);
          const data = await response.json();
          results[username] = data;
        })
      );
      
      return results;
    },
    enabled: selectedAgents.length > 0
  });
  
  const handleAgentSelect = (username: string) => {
    if (selectedAgents.includes(username)) {
      setSelectedAgents(selectedAgents.filter(agent => agent !== username));
    } else if (selectedAgents.length < 5) {
      setSelectedAgents([...selectedAgents, username]);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const filteredAgents = topAgents?.filter((agent: Agent) => 
    agent.mastodonUsername.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Prepare chart data
  const prepareChartData = () => {
    if (!agentHistories || Object.keys(agentHistories).length === 0) return [];
    
    // Create a map of all timestamps
    const allTimestamps = new Set<string>();
    Object.values(agentHistories).forEach((history: Agent[]) => {
      history.forEach(snapshot => {
        if (snapshot.timestamp) {
          allTimestamps.add(snapshot.timestamp);
        }
      });
    });
    
    // Sort timestamps chronologically
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    // Create data points for each timestamp
    return sortedTimestamps.map(timestamp => {
      const dataPoint: any = {
        timestamp: formatDate(timestamp),
        date: new Date(timestamp)
      };
      
      // Add data for each agent at this timestamp
      Object.entries(agentHistories).forEach(([username, history]) => {
        const snapshot = history.find(s => s.timestamp ? s.timestamp === timestamp : false);
        if (snapshot) {
          switch (metric) {
            case 'score':
              dataPoint[username] = snapshot.score;
              break;
            case 'followers':
              dataPoint[username] = snapshot.followersCount || 0;
              break;
            case 'likes':
              dataPoint[username] = snapshot.likesCount || 0;
              break;
            case 'retweets':
              dataPoint[username] = snapshot.retweetsCount || 0;
              break;
          }
        }
      });
      
      return dataPoint;
    });
  };

  const chartData = prepareChartData();
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Link to="/">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            <span>Back to Leaderboard</span>
          </Button>
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
        Advanced Analytics
      </h1>
      
      <Tabs defaultValue="comparison" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">Agent Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="comparison" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Selection Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Agents</CardTitle>
                <CardDescription>
                  Choose up to 5 agents to compare {selectedAgents.length > 0 && `(${selectedAgents.length}/5 selected)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="metric">Metric</Label>
                    <Select 
                      value={metric} 
                      onValueChange={(value) => setMetric(value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="score">Score</SelectItem>
                        <SelectItem value="followers">Followers</SelectItem>
                        <SelectItem value="likes">Likes</SelectItem>
                        <SelectItem value="retweets">Retweets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="search">Search Agents</Label>
                    <Input
                      id="search"
                      placeholder="Search by username"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                  </div>
                  
                  <div className="h-[400px] overflow-y-auto border rounded-md p-2">
                    {isLoadingTopAgents ? (
                      Array(10).fill(0).map((_, i) => (
                        <div key={i} className="p-2 mb-2">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))
                    ) : (
                      filteredAgents.map((agent: Agent) => (
                        <div 
                          key={agent.mastodonUsername}
                          className={`p-2 mb-2 rounded-md cursor-pointer flex items-center justify-between hover:bg-gray-700 transition-colors ${
                            selectedAgents.includes(agent.mastodonUsername) ? 'bg-gray-700' : 'bg-gray-800'
                          }`}
                          onClick={() => handleAgentSelect(agent.mastodonUsername)}
                        >
                          <div className="flex items-center">
                            {agent.avatarUrl && (
                              <img 
                                src={agent.avatarUrl} 
                                alt={agent.mastodonUsername}
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            )}
                            <span>{agent.mastodonUsername}</span>
                          </div>
                          <span className="text-sm text-gray-400">{formatNumber(agent.score)}</span>
                        </div>
                      ))
                    )}
                    
                    {!isLoadingTopAgents && filteredAgents.length === 0 && (
                      <div className="p-4 text-center text-gray-400">
                        No agents found
                      </div>
                    )}
                  </div>
                  
                  {selectedAgents.length > 0 && (
                    <div className="mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedAgents([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Chart Panel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {metric === 'score' ? 'Score Comparison' : 
                   metric === 'followers' ? 'Followers Comparison' :
                   metric === 'likes' ? 'Likes Comparison' : 'Retweets Comparison'}
                </CardTitle>
                <CardDescription>
                  Historical comparison of {metric} over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAgents.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-gray-400">Select agents to view comparison</p>
                  </div>
                ) : isLoadingHistories ? (
                  <div className="h-[400px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-gray-400">No historical data available</p>
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis 
                          dataKey="timestamp" 
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(value) => {
                            if (typeof value === 'string') {
                              const date = new Date(value);
                              return `${date.getMonth() + 1}/${date.getDate()}`;
                            }
                            return value;
                          }}
                        />
                        <YAxis 
                          tick={{ fill: '#9ca3af' }} 
                          tickFormatter={(value) => formatNumber(value)}
                        />
                        <Tooltip 
                          formatter={(value: any) => [formatNumber(value), ""]}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                        />
                        <Legend />
                        {selectedAgents.map((username, index) => (
                          <Line 
                            key={username}
                            type="monotone"
                            dataKey={username}
                            name={username}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            activeDot={{ r: 8 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Key Insights */}
                {selectedAgents.length > 0 && chartData.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedAgents.map((username, index) => {
                      // Calculate the growth
                      const agentData = agentHistories?.[username] || [];
                      if (agentData.length < 2) return null;
                      
                      const oldestEntry = agentData[agentData.length - 1];
                      const newestEntry = agentData[0];
                      
                      let oldValue, newValue;
                      switch (metric) {
                        case 'score':
                          oldValue = oldestEntry.score;
                          newValue = newestEntry.score;
                          break;
                        case 'followers':
                          oldValue = oldestEntry.followersCount || 0;
                          newValue = newestEntry.followersCount || 0;
                          break;
                        case 'likes':
                          oldValue = oldestEntry.likesCount || 0;
                          newValue = newestEntry.likesCount || 0;
                          break;
                        case 'retweets':
                          oldValue = oldestEntry.retweetsCount || 0;
                          newValue = newestEntry.retweetsCount || 0;
                          break;
                      }
                      
                      const change = newValue - oldValue;
                      const percentChange = oldValue !== 0 ? (change / oldValue) * 100 : 0;
                      
                      return (
                        <div 
                          key={username}
                          className="p-4 rounded-md border border-gray-700 bg-gray-800"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            ></div>
                            <h3 className="font-semibold">{username}</h3>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-400">Current: {formatNumber(newValue)}</span>
                            <span className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {change >= 0 ? '+' : ''}{formatNumber(change)} ({percentChange.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>
                Coming soon: Advanced trend analysis and predictions
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-gray-400">This feature is under development</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}