import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, ExternalLink } from 'lucide-react';
import { formatNumber, formatCompactNumber, formatDate, formatWalletAddress } from '@/utils/formatters';

export default function AgentDetail() {
  const [match, params] = useRoute('/agent/:username');
  const [_, setLocation] = useLocation();
  const username = params?.username;

  // Redirect if no username
  useEffect(() => {
    if (!username) {
      setLocation('/');
    }
  }, [username, setLocation]);

  // Query agent details
  const { data: agent, isLoading } = useQuery({
    queryKey: [`/api/agents/${username}`],
    enabled: !!username,
  });

  // Query agent history
  const { data: history } = useQuery({
    queryKey: [`/api/agents/${username}/history`],
    enabled: !!username,
  });

  if (!username || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4">Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h1 className="text-xl font-bold mb-4">Agent Not Found</h1>
            <p className="mb-6">Could not find agent with username: @{username}</p>
            <Button onClick={() => setLocation('/')}>
              Back to Leaderboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          className="mb-6 flex items-center gap-2" 
          onClick={() => setLocation('/')}
        >
          <ArrowLeft size={16} />
          Back to Leaderboard
        </Button>
        
        <div className="relative">
          <div className="h-40 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-t-lg"></div>
          <div className="absolute bottom-0 transform translate-y-1/2 left-8">
            <img 
              className="h-24 w-24 rounded-full border-4 border-gray-800" 
              src={agent.avatarUrl || `https://ui-avatars.com/api/?name=${agent.mastodonUsername}&background=random`} 
              alt={`@${agent.mastodonUsername}`}
            />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-b-lg p-6 pt-16 mt-12 mb-6">
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
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm break-all flex justify-between items-center">
                <span>{agent.walletAddress}</span>
                <a 
                  href={`https://etherscan.io/address/${agent.walletAddress}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary ml-2"
                >
                  <ExternalLink size={16} />
                </a>
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
        </div>
        
        {history && history.length > 1 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Score History</h3>
            <div className="h-64">
              {/* This would be a chart showing score history */}
              <div className="h-full w-full bg-gray-900 rounded-lg flex items-end p-4">
                {history.slice(0, 7).reverse().map((entry, index) => (
                  <div 
                    key={index}
                    className="flex-1 bg-primary rounded-t-md mx-1"
                    style={{ 
                      height: `${Math.max(10, (entry.score / Math.max(...history.map(h => h.score))) * 100)}%` 
                    }}
                    title={`Score: ${entry.score}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
