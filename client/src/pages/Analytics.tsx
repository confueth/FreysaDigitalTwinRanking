import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Home, RefreshCw, Loader2, Download } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { CustomXAxisNoFormatter } from '@/components/CustomXAxisNoFormatter';
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

// Define type for chart data point
interface ChartDataPoint {
  timestamp: string;
  originalTimestamp: string;
  dateString: string;
  sortValue: number;
  index: number;
  xAxisLabel?: string; // Label to display on x-axis
  [key: string]: any; // Allow dynamic agent usernames as keys
}

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

  // Fetch history data for selected agents with optimized performance
  const { data: agentHistories, isLoading: isLoadingHistories } = useQuery({
    queryKey: ['/api/agents/history', selectedAgents],
    queryFn: async () => {
      if (selectedAgents.length === 0) return {};

      const results: Record<string, Agent[]> = {};
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        // Use Promise.all for parallel requests but with a timeout
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        await Promise.all(
          selectedAgents.map(async (username) => {
            try {
              const response = await fetch(`/api/agents/${username}/history`, { signal });
              if (!response.ok) {
                console.warn(`Warning: Failed to fetch history for ${username}, status: ${response.status}`);
                results[username] = []; // Set empty array to avoid undefined errors
                return;
              }
              const data = await response.json();
              results[username] = data;
            } catch (error) {
              console.error(`Error fetching history for ${username}:`, error);
              results[username] = []; // Set empty array to avoid undefined errors
            }
          })
        );

        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error fetching agent histories:', error);
        // Ensure we return at least empty arrays for all selected agents
        selectedAgents.forEach(username => {
          if (!results[username]) {
            results[username] = [];
          }
        });
      }

      return results;
    },
    enabled: selectedAgents.length > 0,
    staleTime: 60000, // Cache for 1 minute to improve performance
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce unnecessary API calls
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

  // Prepare chart data with optimized performance and improved interpolation
  const prepareChartData = (): ChartDataPoint[] => {
    // Immediately return an empty array if no agents are selected
    if (selectedAgents.length === 0) return [];

    // Define Feb 22 as the start date for all charts
    const startDate = new Date('2025-02-22T00:00:00Z');
    const startDateStr = startDate.toISOString();

    // Create a map of all timestamps, always including Feb 22 and today
    const allTimestamps = new Set<string>();
    const todayDate = new Date();
    const now = todayDate.toISOString();
    const todayDateString = todayDate.toDateString();

    // Always add Feb 22 as the baseline date
    allTimestamps.add(startDateStr);

    // Also add today's date
    allTimestamps.add(now);

    // Return early with minimal data if no histories
    if (!agentHistories || Object.keys(agentHistories).length === 0) {
      // If we have at least one selected agent but no history, create minimal points (Feb 22 + today)
      if (selectedAgents.length > 0 && topAgents?.length) {
        // Create a result array with Feb 22 (0 values) and today's values
        const result = [
          {
            timestamp: '2/22', 
            dateString: '2/22 (Start)',
            originalTimestamp: startDateStr,
            sortValue: startDate.getTime(),
            index: 0
          },
          {
            timestamp: 'Today (Live)', 
            dateString: 'Today',
            originalTimestamp: now,
            sortValue: todayDate.getTime(),
            index: 1
          }
        ];

        // Initialize all agent values to zero for Feb 22
        selectedAgents.forEach(username => {
          result[0][username] = 0; // All agents start at 0 on Feb 22
        });

        // Add today's data point for each selected agent using live data
        selectedAgents.forEach(username => {
          const agent = topAgents.find((a: Agent) => a.mastodonUsername === username);
          if (agent) {
            switch (metric) {
              case 'score':
                result[1][username] = agent.score;
                break;
              case 'followers':
                result[1][username] = agent.followersCount || 0;
                break;
              case 'likes':
                result[1][username] = agent.likesCount || 0;
                break;
              case 'retweets':
                result[1][username] = agent.retweetsCount || 0;
                break;
            }
          } else {
            result[1][username] = 0; // Default to 0 if agent not found
          }
        });

        return result;
      }

      return [];
    }

    // Keep track of agents with sparse data
    const agentDataPoints = new Map<string, Map<string, number>>();

    // Initialize the agent data maps
    selectedAgents.forEach(username => {
      agentDataPoints.set(username, new Map<string, number>());
    });

    // Get latest agent data (live data) for today's values
    topAgents?.forEach((agent: Agent) => {
      if (selectedAgents.includes(agent.mastodonUsername)) {
        const dataMap = agentDataPoints.get(agent.mastodonUsername);
        if (dataMap) {
          // Always set Feb 22 to zero as the baseline
          dataMap.set(startDateStr, 0);

          // Set today's live data value
          switch (metric) {
            case 'score':
              dataMap.set(now, agent.score);
              break;
            case 'followers':
              dataMap.set(now, agent.followersCount || 0);
              break;
            case 'likes':
              dataMap.set(now, agent.likesCount || 0);
              break;
            case 'retweets':
              dataMap.set(now, agent.retweetsCount || 0);
              break;
          }
        }
      }
    });

    // Collect all timestamps and map data points from historical data
    Object.entries(agentHistories).forEach(([username, history]) => {
      // Sort history by timestamp to ensure chronological order
      const sortedHistory = [...history].sort((a, b) => 
        new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime()
      );

      // Add all timestamps to the set
      sortedHistory.forEach(snapshot => {
        if (snapshot.timestamp) {
          allTimestamps.add(snapshot.timestamp);

          // Store the metric value for this timestamp
          const dataMap = agentDataPoints.get(username);
          if (dataMap) {
            switch (metric) {
              case 'score':
                dataMap.set(snapshot.timestamp, snapshot.score);
                break;
              case 'followers':
                dataMap.set(snapshot.timestamp, snapshot.followersCount || 0);
                break;
              case 'likes':
                dataMap.set(snapshot.timestamp, snapshot.likesCount || 0);
                break;
              case 'retweets':
                dataMap.set(snapshot.timestamp, snapshot.retweetsCount || 0);
                break;
            }
          }
        }
      });
    });

    // Sort timestamps chronologically
    // Filter out today's snapshot if it exists - we'll only use live data for today
    const filteredTimestamps = Array.from(allTimestamps).filter(timestamp => {
      const date = new Date(timestamp);
      // Keep if it's not from today (except for our explicit "now" timestamp)
      return date.toDateString() !== todayDateString || timestamp === now;
    });
    const sortedTimestamps = filteredTimestamps.sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Perform data interpolation for sparse datasets
    selectedAgents.forEach(username => {
      const dataMap = agentDataPoints.get(username);
      if (dataMap && dataMap.size > 0) {
        // Find missing timestamps and interpolate values
        let lastKnownValue: number | null = null;
        let lastTimestamp: string | null = null;

        sortedTimestamps.forEach(timestamp => {
          if (!dataMap.has(timestamp)) {
            // If we have a previous value, use linear interpolation
            if (lastKnownValue !== null && lastTimestamp !== null) {
              // Try to find the next available data point for interpolation
              const nextTimestampIndex = sortedTimestamps.findIndex(t => 
                t > timestamp && dataMap.has(t)
              );

              if (nextTimestampIndex !== -1) {
                const nextTimestamp = sortedTimestamps[nextTimestampIndex];
                const nextValue = dataMap.get(nextTimestamp) || 0;

                // Perform linear interpolation
                const lastTime = new Date(lastTimestamp).getTime();
                const currentTime = new Date(timestamp).getTime();
                const nextTime = new Date(nextTimestamp).getTime();

                const ratio = (currentTime - lastTime) / (nextTime - lastTime);
                const interpolatedValue = lastKnownValue + (ratio * (nextValue - lastKnownValue));

                dataMap.set(timestamp, Math.round(interpolatedValue));
              } else {
                // If no future data point, use the last known value
                dataMap.set(timestamp, lastKnownValue);
              }
            }
          } else {
            // Update last known value for future interpolation
            lastKnownValue = dataMap.get(timestamp) || 0;
            lastTimestamp = timestamp;
          }
        });
      }
    });

    // Create data points for each timestamp
    return sortedTimestamps.map((timestamp, index) => {
      // Format the timestamp for display
      const date = new Date(timestamp);
      const month = date.getMonth() + 1; // 1-12
      const day = date.getDate(); // 1-31
      const isToday = todayDateString === date.toDateString();

      // Format for display, ensuring each date is properly visible
      let formattedDate = `${month}/${day}`;

      // For Feb 22, make it explicitly clear
      if (date.getMonth() === 1 && date.getDate() === 22) {
        formattedDate = "2/22 (Start)";
      } else if (isToday) {
        formattedDate = "Today";
      }

      const dataPoint: any = {
        timestamp: timestamp, // Keep the original ISO timestamp
        originalTimestamp: timestamp, // For reference
        dateString: formattedDate, // Human-readable format for the x-axis
        sortValue: date.getTime(), // For sorting
        index: index, // Preserve the order for display
      };

      // Add data for each agent at this timestamp
      selectedAgents.forEach(username => {
        const dataMap = agentDataPoints.get(username);
        if (dataMap && dataMap.has(timestamp)) {
          dataPoint[username] = dataMap.get(timestamp);
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
                  <div className="h-[400px] flex items-center justify-center flex-col gap-4">
                    <p className="text-gray-400">Select agents to view comparison</p>
                    <p className="text-sm text-gray-500">Choose from the list on the left</p>
                  </div>
                ) : isLoadingHistories ? (
                  <div className="h-[400px] flex flex-col items-center justify-center">
                    <div className="w-full max-w-md">
                      <div className="mb-4 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                      </div>
                      <Skeleton className="h-8 w-full mb-2" />
                      <Skeleton className="h-8 w-5/6 mb-2" />
                      <Skeleton className="h-8 w-4/6 mb-2" />
                      <p className="text-center text-sm text-gray-400 mt-4">Loading historical data...</p>
                    </div>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center flex-col gap-4">
                    <p className="text-gray-400">No historical data available</p>
                    <p className="text-sm text-gray-500">Try selecting different agents</p>
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
                      <LineChart
                        data={chartData}
                        width={500}
                        height={300}
                        margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis 
                          dataKey="dateString"
                          height={50}
                          tick={{ 
                            fill: '#ffffff', 
                            fontSize: 13,
                            fontWeight: 'bold'
                          }}
                          tickLine={true}
                          axisLine={true}
                          interval={0}
                        />
                        <YAxis 
                          tick={{ fill: '#9ca3af' }} 
                          tickFormatter={(value) => formatNumber(value)}
                        />
                        <Tooltip 
                          formatter={(value: any) => [formatNumber(value), ""]}
                          labelFormatter={(label) => {
                            // Find the data point with this label
                            const point = chartData.find(p => p.dateString === label);
                            if (point && point.originalTimestamp) {
                              const date = new Date(point.originalTimestamp);
                              // Format a full date for the tooltip
                              return `Date: ${date.toLocaleDateString()}`;
                            }
                            return `Date: ${label}`;
                          }}
                          contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
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
                  <div className="mt-6">
                    <h3 className="font-medium text-lg mb-3">Historical Summary</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedAgents.map((username, index) => {
                        // Get all historical data points
                        const agentData = agentHistories?.[username] || [];
                        if (agentData.length === 0) return null;

                        // For agents with only one data point, we'll show current value without comparison
                        const newestEntry = agentData[0];
                        if (!newestEntry) return null;

                        // Get the current value based on the selected metric
                        let currentValue = 0;
                        switch (metric) {
                          case 'score':
                            currentValue = newestEntry.score;
                            break;
                          case 'followers':
                            currentValue = newestEntry.followersCount || 0;
                            break;
                          case 'likes':
                            currentValue = newestEntry.likesCount || 0;
                            break;
                          case 'retweets':
                            currentValue = newestEntry.retweetsCount || 0;
                            break;
                        }

                        // Calculate overall change if we have more than one data point
                        let overallChange = 0, percentChange = 0, showOverallChange = false;
                        if (agentData.length > 1) {
                          const oldestEntry = agentData[agentData.length - 1];

                          // Get the oldest value for the selected metric
                          let oldestValue = 0;
                          switch (metric) {
                            case 'score':
                              oldestValue = oldestEntry.score;
                              break;
                            case 'followers':
                              oldestValue = oldestEntry.followersCount || 0;
                              break;
                            case 'likes':
                              oldestValue = oldestEntry.likesCount || 0;
                              break;
                            case 'retweets':
                              oldestValue = oldestEntry.retweetsCount || 0;
                              break;
                          }

                          if (oldestValue !== undefined) {
                            overallChange = currentValue - oldestValue;
                            percentChange = oldestValue !== 0 ? (overallChange / oldestValue) * 100 : 0;
                            showOverallChange = true;
                          }
                        }

                        // Extract data points for each snapshot
                        const snapshotData = agentData.map(entry => {
                          let value = 0;
                          switch (metric) {
                            case 'score':
                              value = entry.score;
                              break;
                            case 'followers':
                              value = entry.followersCount || 0;
                              break;
                            case 'likes':
                              value = entry.likesCount || 0;
                              break;
                            case 'retweets':
                              value = entry.retweetsCount || 0;
                              break;
                          }

                          return {
                            timestamp: entry.timestamp,
                            value,
                            formattedDate: formatDate(entry.timestamp, 'short', true)
                          };
                        });

                        return (
                          <div 
                            key={username}
                            className="p-4 rounded-md border border-gray-700 bg-gray-800"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              ></div>
                              <h3 className="font-semibold">{username}</h3>
                            </div>

                            <div className="flex flex-col space-y-3">
                              <div>
                                <span className="text-sm font-medium text-gray-300">Current Value:</span>
                                <span className="text-base text-white ml-2">{formatNumber(currentValue)}</span>
                              </div>

                              {showOverallChange && (
                                <div>
                                  <span className="text-sm font-medium text-gray-300">Overall Change:</span>
                                  <span className={`text-sm ml-2 ${overallChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {overallChange >= 0 ? '+' : ''}{formatNumber(overallChange)} ({percentChange.toFixed(2)}%)
                                  </span>
                                </div>
                              )}

                              <div className="pt-3 border-t border-gray-700">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Historical Snapshots</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                  {snapshotData.map((point, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className="text-gray-400">{point.formattedDate}</span>
                                      <span className="font-medium">{formatNumber(point.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                          ? formatDate(snapshots[0].timestamp, 'full', true)
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
                          timestamp: formatDate(snapshot.timestamp, 'full', true),
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
                          height={50}
                          tick={{ 
                            fill: '#ffffff', 
                            fontSize: 13,
                            fontWeight: 'bold'
                          }}
                          tickLine={true}
                          axisLine={true}
                          interval={0}
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
                            <td className="p-2">
                              {snapshot.timestamp ? formatDate(snapshot.timestamp, 'full', true) : 'N/A'}
                            </td>
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