import React from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Agent } from '@/types/agent';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Home, Trash2, Search, Plus, ChevronUp, ChevronDown, Save, LineChart } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';

// Storage key for the user's saved agents
const MY_AGENTS_KEY = 'freysa-my-agents';

export default function MyAgents() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [allAgents, setAllAgents] = React.useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = React.useState<Agent[]>([]);
  const [myAgents, setMyAgents] = React.useState<string[]>([]);
  const [showMyAgentsOnly, setShowMyAgentsOnly] = React.useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = React.useState(true);

  // Load my agents from localStorage on component mount
  React.useEffect(() => {
    const savedAgents = localStorage.getItem(MY_AGENTS_KEY);
    if (savedAgents) {
      try {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed)) {
          setMyAgents(parsed);
        }
      } catch (e) {
        console.error('Error parsing saved agents:', e);
      }
    }
    
    // Fetch all available agents
    fetchAllAgents();
  }, []);

  // Save my agents to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem(MY_AGENTS_KEY, JSON.stringify(myAgents));
  }, [myAgents]);

  // Fetch all agents from the API
  const fetchAllAgents = async () => {
    setIsLoadingAgents(true);
    try {
      // First try to get the latest snapshot ID
      const snapshotsResponse = await fetch('/api/snapshots');
      let allAgentData: Agent[] = [];
      
      if (snapshotsResponse.ok) {
        const snapshots = await snapshotsResponse.json();
        
        if (snapshots && snapshots.length > 0) {
          const latestSnapshotId = snapshots[0].id;
          
          // Use the snapshot ID to get ALL agents from that snapshot
          // This endpoint should return all agents without limits
          const response = await fetch(`/api/snapshots/${latestSnapshotId}/agents`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Loaded ${data.length} agents from snapshot`);
            
            // If we got less than 1000 agents, the server might be applying a limit
            // Let's make another request with a higher explicit limit
            if (data.length < 1000) {
              console.log(`Got only ${data.length} agents, trying with explicit high limit`);
              const highLimitResponse = await fetch(`/api/snapshots/${latestSnapshotId}/agents?limit=10000`);
              if (highLimitResponse.ok) {
                const highLimitData = await highLimitResponse.json();
                if (highLimitData.length > data.length) {
                  console.log(`Got ${highLimitData.length} agents with high limit, using those instead`);
                  allAgentData = highLimitData;
                } else {
                  allAgentData = data;
                }
              } else {
                allAgentData = data;
              }
            } else {
              allAgentData = data;
            }
          } else {
            // Fallback to regular agents endpoint with explicit high limit
            console.warn('Failed to load agents from snapshot, trying fallback method');
            const fallbackResponse = await fetch('/api/agents?limit=10000');
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log(`Loaded ${fallbackData.length} agents from fallback method`);
              allAgentData = fallbackData;
            }
          }
        }
      }
      
      // If we still don't have data, try one last attempt with direct API
      if (allAgentData.length === 0) {
        console.warn('Both snapshot and fallback methods failed, trying direct API');
        const lastAttemptResponse = await fetch('/api/agents?limit=5000');
        if (lastAttemptResponse.ok) {
          const lastAttemptData = await lastAttemptResponse.json();
          console.log(`Loaded ${lastAttemptData.length} agents from last attempt`);
          allAgentData = lastAttemptData;
        }
      }
      
      // Update state with whatever data we have
      if (allAgentData.length > 0) {
        setAllAgents(allAgentData);
        setFilteredAgents(allAgentData);
      } else {
        toast({
          title: 'Warning',
          description: 'Limited agent data available. Search may not include all agents.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // Filter agents based on search query and my agents toggle
  React.useEffect(() => {
    if (searchQuery.trim() === '' && !showMyAgentsOnly) {
      setFilteredAgents(allAgents);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      const searchTerm = searchQuery.toLowerCase().trim();
      
      // Apply filters
      let filtered = [...allAgents];
      
      // Apply search filter if we have a search term
      if (searchTerm) {
        filtered = filtered.filter(agent => {
          const username = agent.mastodonUsername?.toLowerCase() || '';
          
          // Simple substring matching - if the username contains the search term at all
          if (username.includes(searchTerm)) {
            return true;
          }
          
          // Compute levenshtein distance for fuzzy matching
          // This will catch typos and slight variations in spelling
          const distance = levenshteinDistance(username, searchTerm);
          
          // Allow matches that are close enough based on string length
          const threshold = Math.max(2, Math.floor(searchTerm.length / 3));
          return distance <= threshold;
        });
        
        // Sort by relevance - exact matches first, then partial matches
        filtered.sort((a, b) => {
          const usernameA = a.mastodonUsername?.toLowerCase() || '';
          const usernameB = b.mastodonUsername?.toLowerCase() || '';
          
          // Exact matches get priority
          if (usernameA === searchTerm && usernameB !== searchTerm) return -1;
          if (usernameB === searchTerm && usernameA !== searchTerm) return 1;
          
          // Then starts-with matches
          if (usernameA.startsWith(searchTerm) && !usernameB.startsWith(searchTerm)) return -1;
          if (usernameB.startsWith(searchTerm) && !usernameA.startsWith(searchTerm)) return 1;
          
          // Then contains matches
          if (usernameA.includes(searchTerm) && !usernameB.includes(searchTerm)) return -1;
          if (usernameB.includes(searchTerm) && !usernameA.includes(searchTerm)) return 1;
          
          // Finally sort alphabetically
          return usernameA.localeCompare(usernameB);
        });
      }
      
      // Apply my agents filter if toggled
      if (showMyAgentsOnly) {
        filtered = filtered.filter(agent => myAgents.includes(agent.mastodonUsername));
      }
      
      setFilteredAgents(filtered);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, allAgents, myAgents, showMyAgentsOnly]);
  
  // Levenshtein distance implementation for fuzzy matching
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    // Initialize the first row and column
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }
    
    // Calculate the edit distance
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // Deletion
          matrix[j - 1][i] + 1,      // Insertion
          matrix[j - 1][i - 1] + cost // Substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  };

  // Add an agent to my agents list
  const addToMyAgents = (username: string) => {
    // Clean the username - remove @ if present and trim whitespace
    const cleanUsername = username.trim().replace(/^@/, '');
    
    if (!cleanUsername) {
      toast({
        title: 'Invalid Username',
        description: 'Please enter a valid username'
      });
      return;
    }
    
    if (myAgents.includes(cleanUsername)) {
      toast({
        title: 'Already Saved',
        description: `${cleanUsername} is already in your agents list.`
      });
      return;
    }
    
    // Check if this agent exists in our dataset
    const existingAgent = allAgents.find(
      a => a.mastodonUsername.toLowerCase() === cleanUsername.toLowerCase()
    );
    
    if (existingAgent) {
      // If agent exists in our data, use their full profile
      setMyAgents(prev => [...prev, existingAgent.mastodonUsername]);
      toast({
        title: 'Agent Added',
        description: `${existingAgent.mastodonUsername} has been added to your agents.`
      });
    } else {
      // If agent doesn't exist, add the custom username
      setMyAgents(prev => [...prev, cleanUsername]);
      toast({
        variant: 'default',
        title: 'Custom Agent Added',
        description: `${cleanUsername} has been added to your agents. This agent may not appear in analytics until they join the leaderboard.`
      });
    }
  };

  // Remove an agent from my agents list
  const removeFromMyAgents = (username: string) => {
    setMyAgents(prev => prev.filter(name => name !== username));
    toast({
      title: 'Agent Removed',
      description: `${username} has been removed from your agents.`
    });
  };
  
  // Remove all agents from my agents list
  const removeAllAgents = () => {
    if (myAgents.length === 0) {
      toast({
        title: 'No Agents',
        description: 'You have no saved agents to remove.'
      });
      return;
    }
    
    setMyAgents([]);
    toast({
      title: 'All Agents Removed',
      description: `${myAgents.length} agents have been removed from your list.`
    });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Toggle between showing all agents or just my agents
  const handleToggleMyAgents = () => {
    setShowMyAgentsOnly(!showMyAgentsOnly);
  };

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
        
        <Link to="/analytics">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-emerald-800 hover:bg-emerald-700 border-emerald-700 flex items-center gap-1"
          >
            <LineChart className="h-4 w-4" />
            <span>View Analytics</span>
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
        My Agents
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Manage Your Agents</CardTitle>
          <CardDescription>
            Save your favorite agents to track them across the leaderboard and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-400">
                  {myAgents.length} agent{myAgents.length !== 1 ? 's' : ''} saved
                </div>
                {myAgents.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-red-800 hover:bg-red-900/30 text-red-400 flex items-center gap-1"
                    onClick={removeAllAgents}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove All</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Show my agents only</span>
                <Switch
                  checked={showMyAgentsOnly}
                  onCheckedChange={handleToggleMyAgents}
                />
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search for agents..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
                <div className="text-sm font-medium">Agent</div>
                <div className="text-sm font-medium">Actions</div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {isLoadingAgents ? (
                  // Loading skeleton
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="p-3 border-b border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))
                ) : filteredAgents.length > 0 ? (
                  // Agent list
                  filteredAgents.map((agent) => (
                    <div 
                      key={agent.mastodonUsername} 
                      className="p-3 border-b border-gray-700 flex items-center justify-between hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage 
                            src={agent.avatarUrl} 
                            alt={agent.mastodonUsername} 
                          />
                          <AvatarFallback>
                            {agent.mastodonUsername?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {agent.mastodonUsername}
                            {myAgents.includes(agent.mastodonUsername) && (
                              <Badge variant="outline" className="bg-emerald-900/30 border-emerald-700 text-emerald-400 text-xs">
                                My Agent
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            Score: {formatNumber(agent.score)} {agent.city && `• ${agent.city}`}
                          </div>
                        </div>
                      </div>
                      <div>
                        {myAgents.includes(agent.mastodonUsername) ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-800 hover:bg-red-900/30 text-red-400 flex items-center gap-1"
                            onClick={() => removeFromMyAgents(agent.mastodonUsername)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Remove</span>
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-emerald-800 hover:bg-emerald-900/30 text-emerald-400 flex items-center gap-1"
                            onClick={() => addToMyAgents(agent.mastodonUsername)}
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : isSearching ? (
                  // Searching state
                  <div className="p-6 text-center">
                    <div className="inline-block animate-spin mb-3">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-gray-400">Searching...</p>
                  </div>
                ) : (
                  // No results
                  <div className="p-6 text-center">
                    <p className="text-gray-400 mb-2">
                      {searchQuery.trim() 
                        ? `No agents found matching "${searchQuery}"`
                        : showMyAgentsOnly && myAgents.length === 0
                          ? "You haven't saved any agents yet"
                          : "No agents available"
                      }
                    </p>
                    {searchQuery.trim() && (
                      <>
                        <p className="text-sm text-gray-500 mb-3">
                          Agent not found in the dataset? You can still add them manually:
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-emerald-900/30 text-emerald-400 border-emerald-700"
                          onClick={() => addToMyAgents(searchQuery.trim())}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add "{searchQuery.trim()}" to My Agents
                        </Button>
                      </>
                    )}
                    {showMyAgentsOnly && myAgents.length === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowMyAgentsOnly(false)}
                      >
                        Browse All Agents
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-400">
            Your saved agents will be pre-selected in Analytics and highlighted in the Leaderboard
          </div>
          <Link to="/analytics">
            <Button 
              variant="default" 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Compare My Agents
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}