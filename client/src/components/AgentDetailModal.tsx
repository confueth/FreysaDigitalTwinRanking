import { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { 
  formatNumber, 
  formatCompactNumber, 
  formatDate, 
  formatWalletAddress,
  getScoreChangeClass,
  getChangeValue
} from '@/utils/formatters';
import { X, MapPin, ExternalLink, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define types
interface AgentDetailModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TweetData {
  id: number;
  content: string;
  timestamp: string;
  likesCount: number;
  retweetsCount: number;
}

interface ExternalAgentData {
  id?: string;
  mastodonUsername: string;
  score: number;
  prevScore?: number;
  avatarUrl?: string;
  city?: string;
  likesCount?: number;
  followersCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
  walletAddress?: string;
  walletBalance?: string;
  mastodonBio?: string;
  humanFeedback?: string;
  bioUpdatedAt?: string;
  ubiClaimedAt?: string;
  tweets?: TweetData[];
}

/**
 * Simple but effective LRU (Least Recently Used) cache implementation
 * Optimized for agent data storage with automatic cleanup when capacity is reached
 */
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private order: K[];

  /**
   * Creates a new LRU Cache with the specified capacity
   * @param capacity Maximum number of items to store in the cache
   */
  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.order = [];
  }

  /**
   * Check if a key exists in the cache
   * @param key The key to check
   * @returns True if the key exists in the cache, false otherwise
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Get an item from the cache and mark it as recently used
   * @param key The key to retrieve
   * @returns The value associated with the key, or undefined if not found
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move key to the end (most recently used)
    this.order = this.order.filter(k => k !== key);
    this.order.push(key);
    
    return this.cache.get(key);
  }

  /**
   * Add or update an item in the cache
   * If the cache is at capacity, the least recently used item will be removed
   * @param key The key to set or update
   * @param value The value to associate with the key
   */
  set(key: K, value: V): void {
    // If key exists, update and move to most recently used
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.order = this.order.filter(k => k !== key);
      this.order.push(key);
      return;
    }
    
    // If at capacity, remove least recently used
    if (this.order.length >= this.capacity) {
      const leastUsed = this.order.shift();
      if (leastUsed !== undefined) {
        this.cache.delete(leastUsed);
      }
    }
    
    // Add new item
    this.cache.set(key, value);
    this.order.push(key);
  }

  /**
   * Delete an item from the cache
   * @param key The key to delete
   * @returns True if the item was found and deleted, false otherwise
   */
  delete(key: K): boolean {
    if (!this.cache.has(key)) return false;
    
    this.order = this.order.filter(k => k !== key);
    return this.cache.delete(key);
  }
  
  /**
   * Get the current number of items in the cache
   * @returns The number of items currently in the cache
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.order = [];
  }
}

// Initialize cache with capacity - increased for better performance
const agentCache = new LRUCache<string, ExternalAgentData>(20);

export default function AgentDetailModal({ username, isOpen, onClose }: AgentDetailModalProps) {
  const { toast } = useToast();
  // No need to manually clean up cache as our LRUCache handles this automatically
  useEffect(() => {
    // Do any component initialization work here if needed
    return () => {
      // Clean up resources when component unmounts
    };
  }, []);

  // Query agent details from our API for the latest live data
  const { data: agent, isLoading, error } = useQuery({
    queryKey: [`/api/agents/${username}`],
    queryFn: async () => {
      try {
        // Check if we have a cached version first with a shorter validity (5 minutes)
        // for live agent data to ensure we get fresh information
        const cacheKey = `agent_${username}`;
        if (agentCache.has(cacheKey)) {
          console.log(`Using cached data for agent ${username}`);
          const cachedData = agentCache.get(cacheKey);
          
          // Check if cache is fresh enough (5 minutes)
          const cacheTime = (cachedData as any)?.cacheTime || 0;
          if (Date.now() - cacheTime < 5 * 60 * 1000) {
            return cachedData;
          }
        }
        
        console.log(`Fetching fresh data for agent ${username}`);
        const response = await fetch(`/api/agents/${username}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch agent details: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store in cache with timestamp
        agentCache.set(cacheKey, {
          ...data,
          cacheTime: Date.now()
        });
        
        return data;
      } catch (error) {
        console.error("Failed to fetch agent data", error);
        throw error;
      }
    },
    enabled: isOpen,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // We no longer need to switch between APIs - only use our direct API which uses live data

  // Format wallet balance to 3 decimal places if available - memoized to avoid recalculation
  const formattedWalletBalance = useMemo(() => 
    agent?.walletBalance ? parseFloat(agent.walletBalance).toFixed(3) : undefined,
  [agent?.walletBalance]);
    
  // Clean HTML from tweet content - memoized function for improved performance
  const formatTweetContent = useCallback((content: string): string => {
    // Check if the content is empty or too long
    if (!content || content.length > 5000) {
      return content?.substring(0, 280) || '';
    }
    
    // Remove HTML tags while preserving text - optimized regex
    const withoutTags = content.replace(/<[^>]*>/g, ' ').trim();
    
    // Remove excess whitespace with a single pass
    const cleanedContent = withoutTags.replace(/\s+/g, ' ');
    
    // Unescape common HTML entities in a single pass
    return cleanedContent
      .replace(/&(amp|lt|gt|quot|#039|nbsp);/g, match => {
        switch(match) {
          case '&amp;': return '&';
          case '&lt;': return '<';
          case '&gt;': return '>';
          case '&quot;': return '"';
          case '&#039;': return "'";
          case '&nbsp;': return ' ';
          default: return match;
        }
      });
  }, []);

  // Handle error
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load agent details. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-800 border border-gray-700 text-white p-0 w-[calc(100vw-16px)] sm:w-auto max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-auto rounded-lg">
        <DialogTitle className="sr-only">Agent Details for {username}</DialogTitle>
        <DialogDescription className="sr-only">
          Detailed information about this agent including stats and recent activity
        </DialogDescription>
        
        <div className="relative">
          <div className="h-32 sm:h-40 bg-gradient-to-r from-purple-900 to-indigo-900" />
          <div className="absolute bottom-0 transform translate-y-1/2 left-4 sm:left-8">
            {isLoading ? (
              <Skeleton className="h-16 w-16 sm:h-24 sm:w-24 rounded-full border-3 sm:border-4 border-gray-800" />
            ) : (
              <img 
                className="h-16 w-16 sm:h-24 sm:w-24 rounded-full border-3 sm:border-4 border-gray-800" 
                src={agent?.avatarUrl || `https://ui-avatars.com/api/?name=${username}&background=random`} 
                alt={`@${username} avatar`}
                loading="lazy"
              />
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 pt-12 sm:pt-16">
          {isLoading ? (
            <AgentDetailSkeleton />
          ) : agent ? (
            <>
              <div className="flex flex-col md:flex-row justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">@{agent.mastodonUsername}</h2>
                  {agent.city && (
                    <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      <span className="text-sm sm:text-base text-gray-400">{agent.city}</span>
                    </div>
                  )}
                  
                  {/* Bio/Human Feedback Tabs */}
                  {(agent.mastodonBio || agent.humanFeedback) && (
                    <div className="mt-3 sm:mt-4">
                      <Tabs defaultValue={agent.mastodonBio ? "bio" : "feedback"} className="w-full">
                        <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                          <TabsTrigger value="bio" disabled={!agent.mastodonBio} className="flex items-center gap-1">
                            <User className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Bio</span>
                          </TabsTrigger>
                          <TabsTrigger value="feedback" disabled={!agent.humanFeedback} className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Feedback</span>
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="bio" className="mt-2">
                          {agent.mastodonBio ? (
                            <p className="text-sm sm:text-base text-gray-300">{agent.mastodonBio}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No bio available</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="feedback" className="mt-2">
                          {agent.humanFeedback ? (
                            <p className="text-sm sm:text-base text-gray-300">{agent.humanFeedback}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No human feedback available</p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
                <div className="mt-3 md:mt-0 md:ml-4 self-start">
                  <div className="flex flex-col items-center p-3 sm:p-4 rounded-lg bg-gray-900">
                    <div className="text-xl sm:text-2xl font-bold">{formatNumber(agent.score)}</div>
                    <div className="text-xs sm:text-sm text-gray-400">Current Score</div>
                    {agent.prevScore && (
                      <div className={`flex items-center mt-1 text-xs sm:text-sm ${getScoreChangeClass(agent.score, agent.prevScore)}`}>
                        {agent.score >= agent.prevScore ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                            </svg>
                            <span className="whitespace-nowrap">{getChangeValue(agent.score, agent.prevScore)}</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                            </svg>
                            <span className="whitespace-nowrap">{getChangeValue(agent.score, agent.prevScore)}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
                <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-xl font-bold">{formatCompactNumber(agent.followersCount)}</div>
                  <div className="text-xs sm:text-sm text-gray-400">Followers</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-xl font-bold">{formatCompactNumber(agent.likesCount)}</div>
                  <div className="text-xs sm:text-sm text-gray-400">Likes</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-xl font-bold">{formatCompactNumber(agent.retweetsCount)}</div>
                  <div className="text-xs sm:text-sm text-gray-400">Retweets</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-xl font-bold">{formatCompactNumber(agent.repliesCount)}</div>
                  <div className="text-xs sm:text-sm text-gray-400">Replies</div>
                </div>
              </div>
              
              {agent.walletAddress && (
                <div className="mt-6 sm:mt-8">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Wallet Details (Base)</h3>
                    {formattedWalletBalance && (
                      <div className="bg-gray-900 rounded-lg px-2 sm:px-3 py-1 flex items-center self-start">
                        <span className="text-xs sm:text-sm mr-1 sm:mr-2">ETH Balance:</span>
                        <span className="font-bold text-sm sm:text-base">{formattedWalletBalance}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded-lg p-2 sm:p-3 font-mono text-xs sm:text-sm break-all">
                    <a 
                      href={`https://basescan.org/address/${agent.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline flex items-center"
                    >
                      <span>{agent.walletAddress}</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              )}
              
              {agent.tweets && agent.tweets.length > 0 && (
                <div className="mt-6 sm:mt-8">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Tweets</h3>
                  <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-80 overflow-y-auto pr-1">
                    {agent.tweets.slice(0, 10).map((tweet: TweetData) => (
                      <div key={tweet.id} className="bg-gray-900 rounded-lg p-3 sm:p-4">
                        <p className="mb-2 text-sm sm:text-base">{formatTweetContent(tweet.content)}</p>
                        <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-gray-400">
                          <span className="mb-2 sm:mb-0">{formatDate(tweet.timestamp, 'full', true)}</span>
                          <div className="flex space-x-3 sm:space-x-4">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                              <span>{tweet.likesCount}</span>
                            </div>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>{tweet.retweetsCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {agent.tweets.length > 10 && (
                      <div className="mt-2 text-center">
                        <span className="text-gray-400 text-xs sm:text-sm">
                          Showing 10 of {agent.tweets.length} tweets
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between text-xs sm:text-sm text-gray-400">
                  <div className="mb-2 sm:mb-0">
                    <span>Bio Updated:</span> <span>{agent.bioUpdatedAt ? formatDate(agent.bioUpdatedAt, 'full', true) : 'Unknown'}</span>
                  </div>
                  <div>
                    <span>UBI Claimed:</span> <span>{agent.ubiClaimedAt ? formatDate(agent.ubiClaimedAt, 'full', true) : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center sm:gap-3 gap-2">
                <a 
                  href={`https://digital-clone-production.onrender.com/digital-clones/clones/${agent.mastodonUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white flex items-center justify-center gap-1 w-full sm:w-auto">
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">View API Data</span>
                  </Button>
                </a>
                <a 
                  href={`https://social.freysa.ai/@${agent.mastodonUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white flex items-center justify-center gap-1 w-full sm:w-auto">
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">View Mastadon Profile</span>
                  </Button>
                  
                </a>
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
        <div className="flex-1 min-w-0">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-40 bg-gray-700 mb-2" />
          <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 bg-gray-700 mb-3 sm:mb-4" />
          
          {/* Tab skeleton */}
          <div className="mb-3">
            <Skeleton className="h-8 sm:h-10 w-[300px] bg-gray-700 mb-3 rounded-lg" />
            <Skeleton className="h-3 sm:h-4 w-full bg-gray-700 mb-1 sm:mb-2" />
            <Skeleton className="h-3 sm:h-4 w-3/4 bg-gray-700" />
          </div>
        </div>
        <Skeleton className="h-16 sm:h-24 w-24 sm:w-32 bg-gray-700 rounded-lg mt-3 sm:mt-4 md:mt-0" />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
        <Skeleton className="h-16 sm:h-20 bg-gray-700 rounded-lg" />
        <Skeleton className="h-16 sm:h-20 bg-gray-700 rounded-lg" />
        <Skeleton className="h-16 sm:h-20 bg-gray-700 rounded-lg" />
        <Skeleton className="h-16 sm:h-20 bg-gray-700 rounded-lg" />
      </div>
      
      <Skeleton className="h-6 sm:h-8 w-28 sm:w-32 bg-gray-700 mt-6 sm:mt-8 mb-2" />
      <Skeleton className="h-10 sm:h-12 w-full bg-gray-700 rounded-lg" />
      
      <Skeleton className="h-6 sm:h-8 w-28 sm:w-32 bg-gray-700 mt-6 sm:mt-8 mb-2" />
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-20 sm:h-24 w-full bg-gray-700 rounded-lg" />
        <Skeleton className="h-20 sm:h-24 w-full bg-gray-700 rounded-lg" />
      </div>
    </>
  );
}
