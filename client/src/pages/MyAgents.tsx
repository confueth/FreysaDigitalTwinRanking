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

  // Fetch all agents from the API, using limit=0 to get all agents
  const fetchAllAgents = async () => {
    setIsLoadingAgents(true);
    try {
      // Use limit=0 to get all agents (not just top agents)
      const response = await fetch('/api/agents?limit=0');
      if (response.ok) {
        const data = await response.json();
        setAllAgents(data);
        setFilteredAgents(data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load agents',
          variant: 'destructive'
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
      
      // Function to calculate fuzzy match score
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
      
      // Apply filters
      let filtered = [...allAgents];
      
      // Apply search filter if we have a search term
      if (searchTerm) {
        const scoredAgents = filtered.map(agent => ({
          agent,
          score: calculateSimilarity(agent.mastodonUsername || '', searchTerm)
        }));
        
        filtered = scoredAgents
          .filter(item => item.score > 0.3) // Keep only reasonably similar matches
          .sort((a, b) => b.score - a.score) // Sort by score descending
          .map(item => item.agent);
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

  // Add an agent to my agents list
  const addToMyAgents = (username: string) => {
    if (myAgents.includes(username)) {
      toast({
        title: 'Already Saved',
        description: `${username} is already in your agents list.`
      });
      return;
    }
    
    setMyAgents(prev => [...prev, username]);
    toast({
      title: 'Agent Added',
      description: `${username} has been added to your agents.`
    });
  };

  // Remove an agent from my agents list
  const removeFromMyAgents = (username: string) => {
    setMyAgents(prev => prev.filter(name => name !== username));
    toast({
      title: 'Agent Removed',
      description: `${username} has been removed from your agents.`
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
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {myAgents.length} agent{myAgents.length !== 1 ? 's' : ''} saved
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
                      <p className="text-sm text-gray-500">
                        Try a different search term or browse the full list
                      </p>
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