import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Home, RefreshCw, Loader2, Download, User, Users } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
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
  const [showMyAgentsOnly, setShowMyAgentsOnly] = useState<boolean>(false);
  const [myAgents, setMyAgents] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Storage key for the user's saved agents - keep in sync with MyAgents page
  const MY_AGENTS_KEY = 'freysa-my-agents';

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

  // Function to download live leaderboard data
  const generateLiveDataCsv = () => {
    // Fetch all live agents
    fetch(`/api/agents?limit=0`)
      .then(response => response.json())
      .then(agents => {
        if (!agents || agents.length === 0) {
          toast({
            title: "Error",
            description: "No live agents found",
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
        const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-');

        link.setAttribute("href", url);
        link.setAttribute("download", `live-leaderboard-data-${timestamp}-${time}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Success",
          description: "Live leaderboard data downloaded successfully",
          variant: "default"
        });
      })
      .catch(error => {
        console.error("Error generating live data CSV:", error);
        toast({
          title: "Error",
          description: "Failed to download live leaderboard data",
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

  // Cache snapshot agent data by snapshotId
  const [snapshotAgentsCache, setSnapshotAgentsCache] = useState<Record<number, Agent[]>>({});

  // Load saved agents from localStorage on component mount
  useEffect(() => {
    const savedAgents = localStorage.getItem(MY_AGENTS_KEY);
    if (savedAgents) {
      try {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed)) {
          // Set myAgents state with all saved agents
          setMyAgents(parsed);
          
          // Only if not showing My Agents only, initialize selectedAgents
          if (!showMyAgentsOnly) {
            // Limit to maximum 10 agents for performance
            setSelectedAgents(parsed.slice(0, 10));

            if (parsed.length > 10) {
              toast({
                title: "Note",
                description: "Only the first 10 saved agents are loaded for comparison.",
              });
            }
          }
        }
      } catch (e) {
        console.error('Error parsing saved agents:', e);
      }
    }
  }, []);
  
  // Listen for changes to My Agents in localStorage to keep our state in sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MY_AGENTS_KEY && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMyAgents(parsed);
            
            // If we're in "My Agents Only" mode, update the selected agents
            if (showMyAgentsOnly) {
              // Limit to maximum 10 agents for the chart
              setSelectedAgents(parsed.slice(0, 10));
            }
          }
        } catch (e) {
          console.error('Error parsing updated My Agents:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [showMyAgentsOnly]);

  // Fetch agents for each snapshot when snapshots are loaded
  useEffect(() => {
    const fetchSnapshotAgents = async () => {
      if (!snapshots || snapshots.length === 0) return;

      const newCache: Record<number, Agent[]> = {};

      // Fetch agent data for each snapshot concurrently
      await Promise.all(snapshots.map(async (snapshot: Snapshot) => {
        if (snapshotAgentsCache[snapshot.id]) {
          // Use cached data if available
          newCache[snapshot.id] = snapshotAgentsCache[snapshot.id];
          return;
        }

        try {
          const response = await fetch(`/api/snapshots/${snapshot.id}/agents?limit=0`);
          if (!response.ok) {
            console.warn(`Failed to fetch agents for snapshot ${snapshot.id}`);
            return;
          }

          const agents = await response.json();

          // Add timestamp to agents for consistency with history data
          const agentsWithTimestamp = agents.map((agent: Agent) => ({
            ...agent,
            timestamp: snapshot.timestamp
          }));

          newCache[snapshot.id] = agentsWithTimestamp;
        } catch (error) {
          console.error(`Error fetching agents for snapshot ${snapshot.id}:`, error);
        }
      }));

      setSnapshotAgentsCache(prev => ({...prev, ...newCache}));
    };

    fetchSnapshotAgents();
  }, [snapshots]);

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

  // Fetch all agents for selection with comprehensive search capability
  const { data: topAgents, isLoading: isLoadingTopAgents } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      // Request all agents by setting limit=0
      const response = await fetch('/api/agents?sortBy=score&limit=0');
      if (!response.ok) throw new Error('Failed to fetch agents');
      return response.json();
    }
  });

  // Separate query for searching agents by exact username
  const { data: searchedAgent, isLoading: isSearchingAgent } = useQuery({
    queryKey: ['/api/agent-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;

      // Try to get the exact agent by username
      try {
        const response = await fetch(`/api/agents/${searchQuery}`);
        if (response.ok) {
          const agent = await response.json();
          return agent;
        }
        return null;
      } catch (error) {
        console.error("Error searching for agent:", error);
        return null;
      }
    },
    enabled: !!searchQuery.trim() && searchQuery.length > 2,
    retry: false,
    refetchOnWindowFocus: false
  });

  // Combine all available agents from different sources
  const allAvailableAgents = React.useMemo(() => {
    const agents = [...(topAgents || [])];

    // Add the searched agent if found and not already in the list
    if (searchedAgent && !agents.some(a => a.mastodonUsername === searchedAgent.mastodonUsername)) {
      agents.push(searchedAgent);
    }

    return agents;
  }, [topAgents, searchedAgent]);

  // Fetch history data for selected agents with optimized performance
  const { data: agentHistories, isLoading: isLoadingHistories } = useQuery({
    queryKey: ['/api/agents/history', selectedAgents],
    queryFn: async () => {
      if (selectedAgents.length === 0) return {};

      const results: Record<string, Agent[]> = {};
      const controller = new AbortController();
      const signal = controller.signal;

      try {
        // Use Promise.all for parallel requests but without timeout
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

  // Handle agent selection/deselection for comparison only (doesn't update My Agents)
  const handleAgentSelect = (username: string) => {
    let newSelectedAgents: string[];

    if (selectedAgents.includes(username)) {
      // Deselect agent
      newSelectedAgents = selectedAgents.filter(agent => agent !== username);
    } else if (selectedAgents.length < 10) {
      // Select new agent
      newSelectedAgents = [...selectedAgents, username];
    } else {
      // Maximum agents reached
      toast({
        title: "Maximum Reached",
        description: "You can only compare up to 10 agents at once.",
        variant: "destructive"
      });
      return;
    }

    // Update state for the current comparison, but don't save to My Agents
    setSelectedAgents(newSelectedAgents);
  };
  
  // Handle toggling between My Agents and All Agents view
  const handleToggleMyAgents = () => {
    const newState = !showMyAgentsOnly;
    
    // Update the state
    setShowMyAgentsOnly(newState);
    
    // If we're turning on My Agents view, update the selected agents to match
    if (newState && myAgents.length > 0) {
      // Limit to maximum 10 agents for the chart
      const agentsToShow = myAgents.slice(0, 10);
      setSelectedAgents(agentsToShow);
      
      if (myAgents.length > 10) {
        toast({
          title: "Note",
          description: "Only the first 10 saved agents are loaded for comparison.",
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Enhanced agent filtering with fuzzy search capabilities and My Agents Only filter
  const filteredAgents = React.useMemo(() => {
    // First filter by My Agents if that toggle is enabled
    let baseAgents = allAvailableAgents || [];
    
    if (showMyAgentsOnly) {
      // Filter to only show agents in the myAgents list
      baseAgents = baseAgents.filter(agent => 
        myAgents.some(username => 
          username.toLowerCase() === agent.mastodonUsername.toLowerCase()
        )
      );
    }
    
    // Then apply search filter if there's a search query
    if (!searchQuery.trim()) {
      return baseAgents.slice(0, 100); // Show top 100 by default
    }

    const searchTermLower = searchQuery.toLowerCase().trim();

    // Function to calculate similarity score for fuzzy matching
    const calculateSimilarity = (agentName: string, searchTerm: string): number => {
      const name = agentName.toLowerCase();

      // Exact match gets highest score
      if (name === searchTerm) return 1.0;

      // Direct inclusion scores high
      if (name.includes(searchTerm)) return 0.8;

      // Check for fuzzy match - calculate how many characters match in sequence
      let matchCount = 0;
      let searchIndex = 0;

      for (let i = 0; i < name.length && searchIndex < searchTerm.length; i++) {
        if (name[i] === searchTerm[searchIndex]) {
          matchCount++;
          searchIndex++;
        }
      }

      // Calculate similarity as percentage of characters matched
      return searchTerm.length > 0 ? matchCount / searchTerm.length : 0;
    };

    // Calculate scores for each agent
    const scoredAgents = baseAgents.map((agent: Agent) => {
      const username = agent.mastodonUsername || '';
      const similarityScore = calculateSimilarity(username, searchTermLower);
      return { agent, score: similarityScore };
    }) || [];

    // Filter agents with some similarity and sort by similarity score
    const matchingAgents = scoredAgents
      .filter(item => item.score > 0.3) // Keep only reasonably similar matches
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map(item => item.agent);

    // If we found the searched agent directly but it wasn't in the results, prioritize it
    if (searchedAgent && !matchingAgents.some(a => a.mastodonUsername === searchedAgent.mastodonUsername)) {
      return [searchedAgent, ...matchingAgents];
    }

    return matchingAgents;
  }, [allAvailableAgents, searchQuery, searchedAgent, showMyAgentsOnly, myAgents]);

  // Handle special case when an agent isn't found but user wants to add them
  const handleCustomAgentSelect = async () => {
    if (!searchQuery.trim()) return;

    const username = searchQuery.trim();

    // Check if the agent already exists in the selection
    if (selectedAgents.includes(username)) {
      toast({
        title: "Already Selected",
        description: `${username} is already in your comparison.`,
      });
      return;
    }

    // Check if we've reached the maximum number of agents
    if (selectedAgents.length >= 10) {
      toast({
        title: "Maximum Reached",
        description: "You can only compare up to 10 agents at once.",
        variant: "destructive"
      });
      return;
    }

    // Create new selected agents list
    const newSelectedAgents = [...selectedAgents, username];

    // Try to fetch the agent directly first
    try {
      const response = await fetch(`/api/agents/${username}`);
      if (response.ok) {
        const agentData = await response.json();

        // If agent is found, add to selection
        setSelectedAgents(newSelectedAgents);

        // Clear the search query
        setSearchQuery('');

        toast({
          title: "Agent Added",
          description: `${username} has been added to your comparison.`,
        });

        return;
      }
    } catch (error) {
      console.error("Error fetching agent:", error);
    }

    // If we get here, the agent couldn't be found but we'll add it anyway
    setSelectedAgents(newSelectedAgents);

    // Clear the search query
    setSearchQuery('');

    toast({
      title: "Custom Agent Added",
      description: `${username} has been added to your comparison. Historical data may be limited.`,
    });
  };

  // Prepare chart data with optimized performance and improved interpolation
  // Now with proper EST timezone handling
  const prepareChartData = (): ChartDataPoint[] => {
    // Immediately return an empty array if no agents are selected
    if (selectedAgents.length === 0) return [];

    // Define Feb 22 as the start date for all charts (in EST timezone)
    // Using America/New_York timezone for consistent display with the backend
    const startDate = new Date('2025-02-22T00:00:00-05:00'); // EST timezone offset
    const startDateStr = startDate.toISOString();

    // Create a map of all timestamps, always including Feb 22 and today
    const allTimestamps = new Set<string>();

    // Get current date in EST timezone for consistency with server data
    const options = { timeZone: 'America/New_York' };
    const todayDate = new Date();
    const now = todayDate.toISOString();
    const todayDateString = todayDate.toLocaleDateString('en-US', options);

    // Always add Feb 22 as the baseline date
    allTimestamps.add(startDateStr);

    // Also add today's date
    allTimestamps.add(now);

    // Add debugging for selected agents
    console.log(`Preparing chart data for ${selectedAgents.length} agents:`, selectedAgents);
    
    // Debug available snapshots
    if (snapshots) {
      console.log(`Available snapshots: ${snapshots.length}`);
      snapshots.forEach((s: Snapshot) => {
        console.log(`Snapshot #${s.id}: ${s.timestamp} - ${s.description || 'No description'}`);
      });
    }
    
    // Debug snapshot cache
    console.log(`Snapshot cache has ${Object.keys(snapshotAgentsCache).length} snapshots`);
    Object.keys(snapshotAgentsCache).forEach(id => {
      console.log(`Cache for snapshot #${id}: ${snapshotAgentsCache[Number(id)]?.length || 0} agents`);
    });

    // Return early with minimal data if no histories
    if (!agentHistories || Object.keys(agentHistories).length === 0) {
      // If we have at least one selected agent but no history, create minimal points (Feb 22 + today)
      if (selectedAgents.length > 0 && topAgents?.length) {
        // Create a result array with Feb 22 (0 values) and today's values
        const result: Array<{
          timestamp: string;
          dateString: string;
          originalTimestamp: string;
          sortValue: number;
          index: number;
          [key: string]: string | number; // Allow dynamic agent usernames as keys
        }> = [
          {
            timestamp: '2/22', 
            dateString: '2/22',
            originalTimestamp: startDateStr,
            sortValue: startDate.getTime(),
            index: 0
          },
          {
            timestamp: 'Today', 
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
          // Case-insensitive search for agent
          const agent = topAgents.find((a: Agent) => 
            a.mastodonUsername.toLowerCase() === username.toLowerCase()
          );
          
          if (agent) {
            console.log(`Found live data for ${username}:`, agent);
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
            console.warn(`No live data found for ${username}`);
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
    if (topAgents) {
      selectedAgents.forEach(username => {
        // Case-insensitive search for the agent
        const agent = topAgents.find((a: Agent) => 
          a.mastodonUsername.toLowerCase() === username.toLowerCase()
        );
        
        if (agent) {
          console.log(`Found live agent data for ${username}:`, {
            score: agent.score,
            followers: agent.followersCount,
            likes: agent.likesCount,
            retweets: agent.retweetsCount,
          });
          
          const dataMap = agentDataPoints.get(username);
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
        } else {
          console.warn(`No live data found for ${username} when checking topAgents`);
        }
      });
    }

    // Initialize Feb 22 baseline values for all agents
    selectedAgents.forEach(username => {
      const dataMap = agentDataPoints.get(username);
      if (dataMap) {
        // All agents start at 0 on Feb 22 for consistency
        dataMap.set(startDateStr, 0);
      }
    });

    // Collect all timestamps and map data points from historical data
    Object.entries(agentHistories).forEach(([username, history]) => {
      console.log(`Processing history for ${username}: ${history.length} data points`);
      
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
            // Extract the metric value directly from the snapshot
            let metricValue = 0;
            switch (metric) {
              case 'score':
                metricValue = snapshot.score;
                break;
              case 'followers':
                metricValue = snapshot.followersCount || 0;
                break;
              case 'likes':
                metricValue = snapshot.likesCount || 0;
                break;
              case 'retweets':
                metricValue = snapshot.retweetsCount || 0;
                break;
            }

            // Only set the value if it doesn't already exist or is more accurate
            if (!dataMap.has(snapshot.timestamp)) {
              dataMap.set(snapshot.timestamp, metricValue);
              const dateStr = new Date(snapshot.timestamp).toLocaleDateString('en-US', options);
              console.log(`Setting history value for ${username} at ${dateStr}: ${metricValue}`);
            }
          }
        }
      });
    });

    // Add data from snapshots to fill any gaps
    // This is crucial for ensuring March 2nd and other snapshots are properly represented
    // IMPORTANT: March 1st data needs special handling (snapshot id 4)
    if (snapshots && snapshots.length > 0) {
      // Map to track which snapshots correspond to which dates
      // This is crucial for handling cases like March 1st correctly
      const snapshotDateMap = new Map<string, {id: number, timestamp: string}>();

      // First pass: map snapshots to their dates to identify the correct snapshot for each date
      snapshots.forEach((snapshot: Snapshot) => {
        const date = new Date(snapshot.timestamp);
        const dateString = date.toLocaleDateString('en-US', options);

        // For specific dates, always use known good snapshots
        if (dateString.includes('3/1')) {
          // Always use snapshot ID 4 for March 1st
          snapshotDateMap.set(dateString, {id: 4, timestamp: snapshot.timestamp});
          console.log("Explicitly using snapshot #4 for March 1st");
        } else if (dateString.includes('2/28')) {
          // Use snapshot ID 2 for Feb 28
          snapshotDateMap.set(dateString, {id: 2, timestamp: snapshot.timestamp});
          console.log("Explicitly using snapshot #2 for Feb 28th");
        } else {
          // For other dates, keep the earliest snapshot for each date
          if (!snapshotDateMap.has(dateString) || 
              snapshot.id < snapshotDateMap.get(dateString)!.id) {
            snapshotDateMap.set(dateString, {id: snapshot.id, timestamp: snapshot.timestamp});
            console.log(`Using snapshot #${snapshot.id} for ${dateString}`);
          }
        }
      });

      // Second pass: process snapshots
      // We iterate through our date map to ensure we use the correct snapshot for each date
      snapshotDateMap.forEach(({id: snapshotId, timestamp}) => {
        // Skip if we don't have agents for this snapshot
        if (!snapshotAgentsCache[snapshotId]) return;

        // Add this timestamp to the set of all timestamps
        allTimestamps.add(timestamp);

        // Look for selected agents in this snapshot - with case-insensitive comparison
        selectedAgents.forEach(username => {
          // Use case-insensitive comparison to handle agents like "Gandhi" vs "gandhi"
          const agent = snapshotAgentsCache[snapshotId]?.find(
            (a: Agent) => a.mastodonUsername.toLowerCase() === username.toLowerCase()
          );

          if (agent) {
            // Found this agent in the snapshot, add data point
            const dataMap = agentDataPoints.get(username);
            if (dataMap) {
              // Extract the correct metric value based on what we're tracking
              let metricValue = 0;
              switch (metric) {
                case 'score':
                  metricValue = agent.score;
                  break;
                case 'followers':
                  metricValue = agent.followersCount || 0;
                  break;
                case 'likes':
                  metricValue = agent.likesCount || 0;
                  break;
                case 'retweets':
                  metricValue = agent.retweetsCount || 0;
                  break;
              }

              // Special debug logging for March 1st data (snapshot id 4)
              const date = new Date(timestamp);
              const dateStr = date.toLocaleDateString('en-US', options);
              const isMarFirstSnapshot = dateStr.includes('3/1');
              if (isMarFirstSnapshot && username === 'PopularFollow') {
                console.log(`March 1st data for PopularFollow: ${metricValue} (snapshot ID: ${snapshotId})`);
              }

              // Set the value for this timestamp
              dataMap.set(timestamp, metricValue);
            }
          }
        });
      });
    }

    // Sort timestamps chronologically
    // Filter out today's snapshot if it exists - we'll only use live data for today
    // Create a map to track date strings to ensure unique dates (prevent duplicate dates)
    const dateMap = new Map<string, string>();

    // Always keep Feb 22 and today
    dateMap.set('2025-02-22', startDateStr);
    dateMap.set(todayDateString, now);

    // Process all other timestamps - keeping only the latest timestamp for each date
    Array.from(allTimestamps).forEach(timestamp => {
      const date = new Date(timestamp);
      const dateString = date.toLocaleDateString('en-US', options);


      // Skip dates we already processed (Feb 22 and today)
      if (dateString === new Date(startDateStr).toLocaleDateString('en-US', options) || 
          dateString === todayDateString) {
        return;
      }

      // For all other dates, keep track of the latest timestamp for each date
      if (!dateMap.has(dateString) || 
          new Date(dateMap.get(dateString) || '').getTime() < date.getTime()) {
        dateMap.set(dateString, timestamp);
      }
    });

    // Get the unique timestamps (one per day)
    const filteredTimestamps = Array.from(dateMap.values());
    const sortedTimestamps = filteredTimestamps.sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Perform data interpolation for sparse datasets
    console.log(`Final timeline has ${sortedTimestamps.length} unique dates`);
    console.log(`About to process interpolation for agents: ${selectedAgents.join(', ')}`);
    
    selectedAgents.forEach(username => {
      const dataMap = agentDataPoints.get(username);
      if (dataMap && dataMap.size > 0) {
        // For 'score' metric, ensure values never decrease over time
        if (metric === 'score') {
          // First, collect all known data points
          const knownPoints: Array<{timestamp: string, value: number}> = [];
          sortedTimestamps.forEach(timestamp => {
            if (dataMap.has(timestamp)) {
              knownPoints.push({
                timestamp,
                value: dataMap.get(timestamp) || 0
              });
            }
          });
          
          // Ensure monotonically increasing scores across all known points
          let maxScore = 0;
          knownPoints.forEach(point => {
            if (point.value < maxScore) {
              // If this score is less than a previous max, adjust it upward
              console.log(`Correcting decreasing score for ${username}: ${point.value} -> ${maxScore}`);
              dataMap.set(point.timestamp, maxScore);
              point.value = maxScore;
            } else {
              maxScore = point.value;
            }
          });
        }
        
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
                const dateStr = new Date(timestamp).toLocaleDateString('en-US', options);
                console.log(`Interpolated value for ${username} at ${dateStr}: ${Math.round(interpolatedValue)}`);
              } else {
                // If no future data point, use the last known value
                dataMap.set(timestamp, lastKnownValue);
                const dateStr = new Date(timestamp).toLocaleDateString('en-US', options);
                console.log(`Using last known value for ${username} at ${dateStr}: ${lastKnownValue}`);
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
      // Format the timestamp for display in EST timezone
      // Using America/New_York timezone to be consistent with backend
      const estOptions = { timeZone: 'America/New_York' };
      const date = new Date(timestamp);

      // Format date in EST timezone
      const estDateString = date.toLocaleDateString('en-US', estOptions);
      const month = date.getMonth() + 1; // 1-12  (Using the actual date object)
      const day = date.getDate(); // 1-31  (Using the actual date object)

      // Check if this is today in EST timezone
      const todayInEST = new Date().toLocaleDateString('en-US', estOptions);
      const isToday = estDateString === todayInEST;

      // Format for display, ensuring each date is properly visible
      let formattedDate = `${month}/${day}`;

      // For Feb 22, make it explicitly clear
      if (month === 2 && day === 22) {
        formattedDate = "2/22 (Start)";
      } else if (isToday) {
        formattedDate = "Today";
      }

      // Use a dynamic object with string indexing for agent data
      const dataPoint: ChartDataPoint = {
        timestamp: isToday ? 'Today (Live)' : formattedDate,
        originalTimestamp: timestamp, // Keep the original timestamp for reference
        dateString: formattedDate, // Human-readable format for the x-axis
        sortValue: date.getTime(), // For sorting
        index: index, // Preserve the order for display
        xAxisLabel: formattedDate, // Explicit label for x-axis
      };

      // Add data for each agent at this timestamp - using snapshot data as the source of truth
      selectedAgents.forEach(username => {
        const dataMap = agentDataPoints.get(username);

        // Check if this is a date that corresponds to a snapshot
        // If so, look up the data directly in the snapshotAgentsCache
        const dateString = new Date(timestamp).toLocaleDateString('en-US', options);
        let value = 0;

        // First, check if we have interpolated data for this timestamp
        if (dataMap && dataMap.has(timestamp)) {
          // Use the interpolated data value - this is crucial! Interpolation was done earlier
          value = dataMap.get(timestamp) || 0;
          console.log(`Using interpolated data for ${username} at ${dateString}: ${value}`);
          
          // Set the value in the data point and skip further processing
          dataPoint[username] = value;
          console.log(`Final value for ${username} at ${formattedDate}: ${value} (${metric}) - from interpolation`);
          return;
        }

        // Special case for March 1st - ALWAYS use snapshot ID 4 
        // This directly addresses the specific issue on March 1st
        if (dateString.includes('3/1')) {
          // Always use snapshot ID 4 data for March 1st as the single source of truth
          const march1stSnapshot = snapshotAgentsCache[4];
          if (march1stSnapshot) {
            const march1stAgent = march1stSnapshot.find(
              (a: Agent) => a.mastodonUsername.toLowerCase() === username.toLowerCase()
            );

            if (march1stAgent) {
              console.log(`Using reliable snapshot ID 4 data for ${username} on March 1st`);

              // Extract the appropriate metric value
              switch (metric) {
                case 'score':
                  value = march1stAgent.score;
                  break;
                case 'followers':
                  value = march1stAgent.followersCount || 0;
                  break;
                case 'likes':
                  value = march1stAgent.likesCount || 0;
                  break;
                case 'retweets':
                  value = march1stAgent.retweetsCount || 0;
                  break;
              }

              // Set the value directly and skip further processing
              dataPoint[username] = value;
              console.log(`Final value for ${username} at ${formattedDate}: ${value} (${metric}) - from March 1st special case`);
              return;
            }
          }
        }

        // For all other dates, try to find a snapshot
        let snapshotId = null;

        // Have to use a manual loop instead of find() to avoid TypeScript casting issues
        if (snapshots) {
          for (let i = 0; i < snapshots.length; i++) {
            const snapshot = snapshots[i] as Snapshot;
            const snapshotDate = new Date(snapshot.timestamp).toLocaleDateString('en-US', options);
            if (snapshotDate === dateString) {
              snapshotId = snapshot.id;
              break;
            }
          }
        }

        if (snapshotId !== null && snapshotAgentsCache[snapshotId]) {
          // We found a snapshot for this date, use its data directly
          const agentInSnapshot = snapshotAgentsCache[snapshotId].find(
            (a: Agent) => a.mastodonUsername.toLowerCase() === username.toLowerCase()
          );

          if (agentInSnapshot) {
            // Get the appropriate metric value
            let metricValue = 0;
            switch (metric) {
              case 'score':
                metricValue = agentInSnapshot.score;
                break;
              case 'followers':
                metricValue = agentInSnapshot.followersCount || 0;
                break;
              case 'likes':
                metricValue = agentInSnapshot.likesCount || 0;
                break;
              case 'retweets':
                metricValue = agentInSnapshot.retweetsCount || 0;
                break;
            }

            // Add logging for specific problematic agents
            if (username.toLowerCase() === "gandhi") {
              console.log(`Found data for Gandhi in snapshot #${snapshotId}: ${metricValue} (${metric})`);
            }

            value = metricValue;
          }
        }

        // Set the final value in the data point
        dataPoint[username] = value;
        console.log(`Final value for ${username} at ${formattedDate}: ${value} (${metric})`);
      });

      return dataPoint;
    });
  };

  const chartData = prepareChartData();

  return (
    <div className="app-container px-4 sm:px-6 py-4">
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

      <h1 className="text-3xl font-bold mb-8 text-left bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
        Advanced Analytics
      </h1>

      <Tabs defaultValue="comparison" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">Agent Comparison</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshot Management</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Selection Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Select Agents</CardTitle>
                <CardDescription>
                  Choose up to 10 agents to compare {selectedAgents.length > 0 && `(${selectedAgents.length}/10 selected)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* My Agents Toggle */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800">
                    <div className="flex items-center space-x-2">
                      {showMyAgentsOnly ? (
                        <User className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Users className="h-4 w-4 text-gray-400" />
                      )}
                      <Label className="text-sm font-medium text-blue-300">Show My Agents Only</Label>
                    </div>
                    <Switch
                      checked={showMyAgentsOnly}
                      onCheckedChange={handleToggleMyAgents}
                      className={showMyAgentsOnly ? "bg-emerald-600" : ""}
                    />
                  </div>
                
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
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="search"
                          placeholder="Enter any agent username"
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                        {isSearchingAgent && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                      {searchQuery.trim() && filteredAgents.length === 0 && (
                        <Button
                          className="whitespace-nowrap"
                          onClick={handleCustomAgentSelect}
                          disabled={selectedAgents.length >= 10 || isSearchingAgent}
                        >
                          Add
                        </Button>
                      )}
                    </div>

                  </div>

                  <div className="h-[400px] overflow-y-auto border rounded-md p-2">
                    {isLoadingTopAgents ? (
                      Array(10).fill(0).map((_, i) => (
                        <div key={i} className="p-2 mb-2">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))
                    ) : filteredAgents.length > 0 ? (
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
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                                }}
                              />
                            )}
                            <span>{agent.mastodonUsername}</span>
                          </div>
                          <span className="text-sm text-gray-400">{formatNumber(agent.score)}</span>
                        </div>
                      ))
                    ) : searchQuery.trim() ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <p className="text-gray-400 mb-4">No agents found with the username "{searchQuery}"</p>

                        {isSearchingAgent ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Searching...</span>
                          </div>
                        ) : (
                          <Button
                            onClick={handleCustomAgentSelect}
                            disabled={selectedAgents.length >= 10}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Add "{searchQuery}" to Compare Anyway
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center p-4">
                        {allAvailableAgents?.length > 0 ? `${allAvailableAgents.length} agents available. Type any agent name to search.` : "No agents available."}
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
                  <div className="h-[600px] flex items-center justify-center flex-col gap-4">
                    <p className="text-gray-400">Select agents to view comparison</p>
                    <p className="text-sm text-gray-500">Choose from the list on the left</p>
                  </div>
                ) : isLoadingHistories ? (
                  <div className="h-[600px] flex flex-col items-center justify-center">
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
                  <div className="h-[600px] flex items-center justify-center flex-col gap-4">
                    <p className="text-gray-400">No historical data available</p>
                    <p className="text-sm text-gray-500">Try selecting different agents</p>
                  </div>
                ) : (
                  <div className="h-[600px] w-full" style={{ minHeight: '550px', minWidth: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={550}>
                      <LineChart
                        data={chartData}
                        width={500}
                        height={550}
                        margin={{ top: 15, right: 30, left: 15, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
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
                          allowDecimals={false}
                          domain={[0, 'dataMax + 1000']}
                          tickCount={12}
                          width={80}
                          padding={{ top: 20, bottom: 20 }}
                        />
                        <Tooltip 
                          formatter={(value: any) => [formatNumber(value), ""]}
                          labelFormatter={(label) => `Date: ${label}`}
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
                            strokeWidth={3}
                            activeDot={{ r: 8 }}
                            dot={{ r: 5 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}


              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="snapshots" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium">Snapshot Management</h3>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateLiveDataCsv}
                title="Download current leaderboard data as CSV"
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
                <span className="hidden sm:inline">Download Live Data</span>
              </Button>

              {/* <Button
                variant="default"
                size="sm"
                onClick={() => createSnapshotMutation.mutate()}
                disabled={createSnapshotMutation.isPending}
              >
                {createSnapshotMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
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
                    <path d="M15 2.5H9a7 7 0 0 0 0 14h6a7 7 0 1 0 0-14z"/>
                    <circle cx="9" cy="9.5" r="1.5"/>
                    <path d="M21 2.5H9a7 7 0 0 0 0 14h12v-14z"/>
                  </svg>
                )}
                <span className="hidden sm:inline">Create Snapshot</span>
              </Button> */}
            </div>
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