import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { formatNumber, formatCompactNumber, formatDate, formatWalletAddress } from '@/utils/formatters';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface AgentDetailModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ExternalAgentData {
  id?: string;
  mastodonUsername: string;
  score: number;
  avatarUrl?: string;
  city?: string;
  likesCount?: number;
  followersCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  walletAddress?: string;
  walletBalance?: string;
  mastodonBio?: string;
  bioUpdatedAt?: string;
  ubiClaimedAt?: string;
  tweets?: {
    id: number;
    content: string;
    timestamp: string;
    likesCount: number;
    retweetsCount: number;
  }[];
}

export default function AgentDetailModal({ username, isOpen, onClose }: AgentDetailModalProps) {
  const { toast } = useToast();
  const [useExternalApi, setUseExternalApi] = useState(true);

  // Query agent details from internal API first
  const { data: internalAgent, isLoading: isInternalLoading, error: internalError } = useQuery({
    queryKey: [`/api/agents/${username}`],
    enabled: isOpen && !useExternalApi,
  });
  
  // Use external API to get fresh data directly from Digital Clone API
  const { data: externalAgent, isLoading: isExternalLoading, error: externalError } = useQuery({
    queryKey: [`direct-agent-${username}`],
    queryFn: async () => {
      try {
        const response = await axios.get<ExternalAgentData>(
          `https://digital-clone-production.onrender.com/digital-clones/clones/${username}`
        );
        return response.data;
      } catch (error) {
        console.error("Failed to fetch from external API, falling back to internal data", error);
        setUseExternalApi(false);
        return null;
      }
    },
    enabled: isOpen && useExternalApi,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
  
  const agent = useExternalApi ? externalAgent : internalAgent;
  const isLoading = useExternalApi ? isExternalLoading : isInternalLoading;
  const error = useExternalApi ? externalError : internalError;

  // Handle error
  useEffect(() => {
    if (error) {
      if (useExternalApi) {
        // If external API fails, try internal API
        setUseExternalApi(false);
        toast({
          title: 'Switching to cached data',
          description: 'Could not fetch latest data, using cached data instead.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load agent details. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }, [error, toast, useExternalApi]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-800 border border-gray-700 text-white p-0 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Agent Details for {username}</DialogTitle>
        <DialogDescription className="sr-only">
          Detailed information about this agent including stats and recent activity
        </DialogDescription>
        
        <div className="relative">
          <div className="h-40 bg-gradient-to-r from-purple-900 to-indigo-900" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:text-gray-200" 
            onClick={onClose}
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </Button>
          <div className="absolute bottom-0 transform translate-y-1/2 left-8">
            {isLoading ? (
              <Skeleton className="h-24 w-24 rounded-full border-4 border-gray-800" />
            ) : (
              <img 
                className="h-24 w-24 rounded-full border-4 border-gray-800" 
                src={agent?.avatarUrl || `https://ui-avatars.com/api/?name=${username}&background=random`} 
                alt={`@${username} avatar`}
                loading="lazy"
              />
            )}
          </div>
        </div>

        <div className="p-6 pt-16">
          {isLoading ? (
            <AgentDetailSkeleton />
          ) : agent ? (
            <>
              <div className="flex flex-col md:flex-row justify-between">
                <div>
                  <h2 className="text-2xl font-bold">@{agent.mastodonUsername}</h2>
                  {agent.city && (
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400">{agent.city}</span>
                    </div>
                  )}
                  {agent.mastodonBio && (
                    <p className="mt-4 text-gray-300">{agent.mastodonBio}</p>
                  )}
                </div>
                <div className="mt-4 md:mt-0">
                  <div className="flex flex-col items-center p-4 rounded-lg bg-gray-900">
                    <div className="text-2xl font-bold">{formatNumber(agent.score)}</div>
                    <div className="text-sm text-gray-400">Current Score</div>
                    {agent.prevScore && (
                      <div className={`flex items-center mt-1 ${agent.score > agent.prevScore ? 'text-green-500' : 'text-red-500'}`}>
                        {agent.score > agent.prevScore ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                            </svg>
                            <span>+{formatNumber(agent.score - agent.prevScore)} since last snapshot</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                            </svg>
                            <span>{formatNumber(agent.score - agent.prevScore)} since last snapshot</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">{formatCompactNumber(agent.followersCount)}</div>
                  <div className="text-sm text-gray-400">Followers</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">{formatCompactNumber(agent.likesCount)}</div>
                  <div className="text-sm text-gray-400">Likes</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">{formatCompactNumber(agent.retweetsCount)}</div>
                  <div className="text-sm text-gray-400">Retweets</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">{formatCompactNumber(agent.repliesCount)}</div>
                  <div className="text-sm text-gray-400">Replies</div>
                </div>
              </div>
              
              {agent.walletAddress && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Wallet Details</h3>
                    {agent.walletBalance && (
                      <div className="bg-gray-900 rounded-lg px-3 py-1 flex items-center">
                        <span className="text-sm mr-2">Balance:</span>
                        <span className="font-bold">{agent.walletBalance}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm break-all">
                    <span>{agent.walletAddress}</span>
                  </div>
                </div>
              )}
              
              {agent.tweets && agent.tweets.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Recent Tweets</h3>
                  <div className="space-y-4">
                    {agent.tweets.map((tweet) => (
                      <div key={tweet.id} className="bg-gray-900 rounded-lg p-4">
                        <p className="mb-2">{tweet.content}</p>
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>{formatDate(tweet.timestamp)}</span>
                          <div className="flex space-x-4">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                              <span>{tweet.likesCount}</span>
                            </div>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>{tweet.retweetsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-8 pt-4 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-400">
                  <div>
                    <span>Bio Updated:</span> <span>{agent.bioUpdatedAt ? formatDate(agent.bioUpdatedAt) : 'Unknown'}</span>
                  </div>
                  <div>
                    <span>UBI Claimed:</span> <span>{agent.ubiClaimedAt ? formatDate(agent.ubiClaimedAt) : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Link to={`/agent/${agent.mastodonUsername}`}>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                    View Full Profile
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg font-medium text-gray-400">Failed to load agent details</p>
              <Button variant="outline" className="mt-4" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between">
        <div>
          <Skeleton className="h-8 w-40 bg-gray-700 mb-2" />
          <Skeleton className="h-5 w-32 bg-gray-700 mb-4" />
          <Skeleton className="h-4 w-full bg-gray-700 mb-2" />
          <Skeleton className="h-4 w-3/4 bg-gray-700" />
        </div>
        <Skeleton className="h-24 w-32 bg-gray-700 rounded-lg mt-4 md:mt-0" />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        <Skeleton className="h-20 bg-gray-700 rounded-lg" />
        <Skeleton className="h-20 bg-gray-700 rounded-lg" />
        <Skeleton className="h-20 bg-gray-700 rounded-lg" />
        <Skeleton className="h-20 bg-gray-700 rounded-lg" />
      </div>
      
      <Skeleton className="h-8 w-32 bg-gray-700 mt-8 mb-2" />
      <Skeleton className="h-12 w-full bg-gray-700 rounded-lg" />
      
      <Skeleton className="h-8 w-32 bg-gray-700 mt-8 mb-2" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full bg-gray-700 rounded-lg" />
        <Skeleton className="h-24 w-full bg-gray-700 rounded-lg" />
      </div>
    </>
  );
}
