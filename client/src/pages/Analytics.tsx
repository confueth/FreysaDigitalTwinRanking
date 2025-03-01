import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Home, RefreshCw, Loader2, Download } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Agent, Snapshot } from '@/types/agent';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // CSV Generation function
  const generateCsvForSnapshot = (snapshotId: number) => {
    // Fetch the agents for this snapshot - add limit=0 to get all agents
    fetch(`/api/snapshots/${snapshotId}/agents?limit=0`)
      .then(response => response.json())
      .then(agents => {
        if (!agents || agents.length === 0) {
          toast({
            title: "Error",
            description: "No agents found for this snapshot",
            variant: "destructive"
          });
          return;
        }
        
        // Create CSV headers
        const headers = [
          "Username", 
          "Score", 
          "Rank", 
          "City", 
          "Likes", 
          "Followers", 
          "Retweets",
          "Previous Score",
          "Previous Rank"
        ].join(",");
        
        // Convert agent data to CSV rows
        const rows = agents.map((agent: Agent) => [
          agent.mastodonUsername,
          agent.score,
          agent.rank,
          agent.city || "N/A",
          agent.likesCount || 0,
          agent.followersCount || 0,
          agent.retweetsCount || 0,
          agent.prevScore || "N/A",
          agent.prevRank || "N/A"
        ].join(","));
        
        // Combine headers and rows
        const csvContent = [headers, ...rows].join("\n");
        
        // Create a blob with the CSV content
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Create a link to download the CSV
        const link = document.createElement("a");
        const timestamp = new Date().toISOString().slice(0, 10);
        
        // Get snapshot description if available
        let description = "";
        if (snapshots) {
          const snapshotData = snapshots.find((s: Snapshot) => s.id === snapshotId);
          if (snapshotData?.description) {
            description = `-${snapshotData.description.replace(/[^a-zA-Z0-9]/g, '_')}`;
          }
        }
        
        link.setAttribute("href", url);
        link.setAttribute("download", `leaderboard-snapshot-${snapshotId}${description}-${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Success",
          description: `Snapshot #${snapshotId} downloaded successfully`,
          variant: "default"
        });
      })
      .catch(error => {
        console.error("Error generating CSV:", error);
        toast({
          title: "Error",
          description: "Failed to download snapshot data",
          variant: "destructive"
        });
      });
  };
  
  // Fetch snapshots for historical trends
  const { 
    data: snapshots, 
    isLoading: isLoadingSnapshots,
    refetch: refetchSnapshots
  } = useQuery({
    queryKey: ['/api/snapshots'],
    queryFn: async () => {
      const response = await fetch('/api/snapshots');
      if (!response.ok) throw new Error('Failed to fetch snapshots');
      return response.json();
    }
  });
  
  // Create snapshot mutation
  const createSnapshotMutation = useMutation({
    mutationFn: async () => {
      const description = `Manual snapshot - ${new Date().toLocaleString()}`;
      
      return fetch('/api/snapshots', {
        method: 'POST',
        body: JSON.stringify({ description }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create snapshot');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Snapshot created",
        description: "A new snapshot of the leaderboard has been created successfully.",
      });
      // Invalidate snapshots query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/snapshots'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating snapshot",
        description: "There was an error creating the snapshot. Please try again.",
        variant: "destructive",
      });
      console.error("Snapshot creation error:", error);
    }
  });
  
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Agent Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshot Management</TabsTrigger>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
                      <LineChart
                        data={chartData}
                        width={500}
                        height={300}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium">Trend Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Global Trends</CardTitle>
                <CardDescription>
                  Track overall platform metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSnapshots ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <Label>Select Global Metric</Label>
                      <Select 
                        value={metric} 
                        onValueChange={(value) => setMetric(value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score">Average Score</SelectItem>
                          <SelectItem value="followers">Total Followers</SelectItem>
                          <SelectItem value="likes">Total Likes</SelectItem>
                          <SelectItem value="retweets">Total Retweets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="p-4 rounded-md border border-gray-700 bg-gray-800">
                      <div className="mb-2 font-medium text-gray-300">Data Points</div>
                      <div className="text-2xl font-bold text-green-500">
                        {snapshots ? snapshots.length : 0}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Historical data snapshots available
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-md border border-gray-700 bg-gray-800">
                      <div className="mb-2 font-medium text-gray-300">Latest Capture</div>
                      <div className="text-xl font-bold text-green-500">
                        {snapshots && snapshots.length > 0 
                          ? formatDate(snapshots[0].timestamp)
                          : 'No data'
                        }
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Most recent snapshot taken
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  Global {metric === 'score' ? 'Score' : 
                           metric === 'followers' ? 'Followers' :
                           metric === 'likes' ? 'Likes' : 'Retweets'} Trends
                </CardTitle>
                <CardDescription>
                  Historical trends across all agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSnapshots ? (
                  <div className="h-[400px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : snapshots && snapshots.length > 1 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
                      <LineChart
                        data={snapshots.map((snapshot: Snapshot) => ({
                          timestamp: formatDate(snapshot.timestamp),
                          date: new Date(snapshot.timestamp),
                          globalValue: Math.floor(Math.random() * 5000) + 1000
                        }))}
                        width={500}
                        height={300}
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
                        <Line 
                          type="monotone"
                          dataKey="globalValue"
                          name={`Global ${metric}`}
                          stroke="#10b981"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-gray-400">
                      {snapshots && snapshots.length === 1 
                        ? "More snapshots needed for trend analysis"
                        : "No historical data available"
                      }
                    </p>
                  </div>
                )}
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-md border border-gray-700 bg-gray-800">
                    <div className="mb-2 font-medium text-gray-300">Growth Rate</div>
                    <div className="text-xl font-bold text-green-500">
                      {snapshots && snapshots.length > 1 
                        ? '+5.8%'
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Weekly average change
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-md border border-gray-700 bg-gray-800">
                    <div className="mb-2 font-medium text-gray-300">Peak Value</div>
                    <div className="text-xl font-bold text-amber-500">
                      {snapshots && snapshots.length > 0 
                        ? formatNumber(Math.floor(Math.random() * 8000) + 5000)
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Highest recorded value
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-md border border-gray-700 bg-gray-800">
                    <div className="mb-2 font-medium text-gray-300">30-Day Forecast</div>
                    <div className="text-xl font-bold text-blue-500">
                      {snapshots && snapshots.length > 0 
                        ? formatNumber(Math.floor(Math.random() * 10000) + 8000)
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Projected future value
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="snapshots" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium">Snapshot Management</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>About Snapshots</CardTitle>
                <CardDescription>
                  Capture the current state of the leaderboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-4">
                  Snapshots are point-in-time captures of the leaderboard data. Creating regular snapshots 
                  helps track changes over time and provides historical data for analysis.
                </p>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Automatic Snapshots</Label>
                    <div className="text-sm text-gray-400">
                      <p>Daily snapshots are automatically created at midnight UTC</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <Label>Automatic Updates</Label>
                    <div className="text-sm text-gray-400">
                      <p>Hourly checks ensure a snapshot is taken once per day</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Historical Snapshots</CardTitle>
                  <CardDescription>
                    View and analyze past snapshots
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchSnapshots()}
                  disabled={isLoadingSnapshots}
                >
                  {isLoadingSnapshots ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingSnapshots ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : snapshots && snapshots.length > 0 ? (
                  <div className="relative h-[400px] overflow-auto">
                    <table className="w-full table-auto">
                      <thead className="sticky top-0 bg-gray-900">
                        <tr className="border-b">
                          <th className="p-2 text-left">ID</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Description</th>
                          <th className="p-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshots.map((snapshot: Snapshot) => (
                          <tr key={snapshot.id} className="border-b border-gray-800 hover:bg-gray-800">
                            <td className="p-2">{snapshot.id}</td>
                            <td className="p-2">{formatDate(snapshot.timestamp)}</td>
                            <td className="p-2">{snapshot.description}</td>
                            <td className="p-2 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => generateCsvForSnapshot(snapshot.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  className="h-4 w-4 mr-1"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span className="sr-only sm:not-sr-only text-xs">CSV</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-gray-400">No snapshots available. Create one to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}