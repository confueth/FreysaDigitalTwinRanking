import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SnapshotStats } from '@/types/agent';
import { formatCompactNumber } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardTimelineProps {
  stats?: SnapshotStats;
  isLoading: boolean;
}

export default function LeaderboardTimeline({ stats, isLoading }: LeaderboardTimelineProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-40 bg-gray-700" />
          <Skeleton className="h-8 w-32 bg-gray-700 rounded-md" />
        </div>
        
        <Skeleton className="h-64 w-full bg-gray-700 rounded-lg mb-6" />
        
        <Skeleton className="h-8 w-32 bg-gray-700 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 bg-gray-700 rounded-lg" />
          <Skeleton className="h-40 bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Score Changes Over Time</h3>
        <Tabs defaultValue="week">
          <TabsList className="bg-gray-900">
            <TabsTrigger value="day" className="data-[state=active]:bg-primary">Day</TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-primary">Week</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-primary">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="h-64 mb-6">
        {/* Mock chart - would be replaced with an actual chart library */}
        <div className="h-full w-full bg-gray-900 rounded-lg flex items-end p-4">
          <div className="w-1/7 h-1/3 bg-primary rounded-t-md mx-1" title="Day 1"></div>
          <div className="w-1/7 h-2/5 bg-primary rounded-t-md mx-1" title="Day 2"></div>
          <div className="w-1/7 h-1/2 bg-primary rounded-t-md mx-1" title="Day 3"></div>
          <div className="w-1/7 h-3/5 bg-primary rounded-t-md mx-1" title="Day 4"></div>
          <div className="w-1/7 h-1/2 bg-primary rounded-t-md mx-1" title="Day 5"></div>
          <div className="w-1/7 h-4/5 bg-primary rounded-t-md mx-1" title="Day 6"></div>
          <div className="w-1/7 h-full bg-primary rounded-t-md mx-1" title="Day 7"></div>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold mb-4">Top Movers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-400 mb-3">Biggest Gainers</h4>
          {stats?.topGainers && stats.topGainers.length > 0 ? (
            stats.topGainers.map((gainer) => (
              <div key={gainer.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                <div className="flex items-center">
                  <img 
                    className="h-8 w-8 rounded-full" 
                    src={gainer.avatarUrl || `https://ui-avatars.com/api/?name=${gainer.mastodonUsername}&background=random`} 
                    alt={`@${gainer.mastodonUsername} avatar`}
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium">@{gainer.mastodonUsername}</div>
                    <div className="text-xs text-gray-500">Rank #{gainer.rank}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-green-500 font-bold">
                    +{formatCompactNumber(gainer.score - (gainer.prevScore || 0))}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400">
              No data available
            </div>
          )}
        </div>
        
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-400 mb-3">Biggest Losers</h4>
          {stats?.topLosers && stats.topLosers.length > 0 ? (
            stats.topLosers.map((loser) => (
              <div key={loser.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                <div className="flex items-center">
                  <img 
                    className="h-8 w-8 rounded-full" 
                    src={loser.avatarUrl || `https://ui-avatars.com/api/?name=${loser.mastodonUsername}&background=random`} 
                    alt={`@${loser.mastodonUsername} avatar`}
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium">@{loser.mastodonUsername}</div>
                    <div className="text-xs text-gray-500">Rank #{loser.rank}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-red-500 font-bold">
                    {formatCompactNumber(loser.score - (loser.prevScore || 0))}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
