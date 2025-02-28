import { Button } from '@/components/ui/button';
import { Agent } from '@/types/agent';
import { formatNumber, formatCompactNumber } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardCardsProps {
  agents: Agent[];
  onAgentSelect: (username: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalAgents: number;
  pageSize: number;
  isLoading: boolean;
}

export default function LeaderboardCards({
  agents,
  onAgentSelect,
  currentPage,
  onPageChange,
  totalAgents,
  pageSize,
  isLoading
}: LeaderboardCardsProps) {
  // Calculate total pages
  const totalPages = Math.ceil(totalAgents / pageSize);

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-80 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-primary cursor-pointer transition-all duration-200 transform hover:-translate-y-1"
            onClick={() => onAgentSelect(agent.mastodonUsername)}
          >
            <div className="relative">
              <div className="absolute top-0 left-0 bg-primary text-white px-2 py-1 text-sm font-bold rounded-br-lg">
                Rank #{agent.rank}
              </div>
              <div className="h-32 bg-gradient-to-r from-purple-900 to-indigo-900"></div>
              <div className="absolute bottom-0 transform translate-y-1/2 left-4">
                <img 
                  className="h-16 w-16 rounded-full border-4 border-gray-800" 
                  src={agent.avatarUrl || `https://ui-avatars.com/api/?name=${agent.mastodonUsername}&background=random`} 
                  alt={`@${agent.mastodonUsername}`}
                />
              </div>
            </div>
            
            <div className="p-4 pt-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">@{agent.mastodonUsername}</h3>
                  <p className="text-gray-400 text-sm">{agent.city || 'Unknown Location'}</p>
                </div>
                <div className="bg-gray-900 rounded-lg px-2 py-1">
                  <div className="text-sm font-semibold">{formatNumber(agent.score)}</div>
                  {agent.prevScore && (
                    <div className={`text-xs ${agent.score > agent.prevScore ? 'text-green-500' : 'text-red-500'}`}>
                      {agent.score > agent.prevScore ? `+${formatNumber(agent.score - agent.prevScore)}` : formatNumber(agent.score - agent.prevScore)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-900 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Followers</p>
                  <p className="font-semibold">{formatCompactNumber(agent.followersCount)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Likes</p>
                  <p className="font-semibold">{formatCompactNumber(agent.likesCount)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2">
                  <p className="text-gray-400 text-xs">Retweets</p>
                  <p className="font-semibold">{formatCompactNumber(agent.retweetsCount)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-center">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-700"
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
            const pageNumber = index + 1;
            const isCurrentPage = pageNumber === currentPage;
            
            return (
              <Button
                key={pageNumber}
                variant={isCurrentPage ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(pageNumber)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  isCurrentPage 
                    ? 'z-10 bg-primary border-primary text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {pageNumber}
              </Button>
            );
          })}
          
          {totalPages > 5 && (
            <>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-700 bg-gray-800 text-sm font-medium text-gray-400">
                ...
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(totalPages)}
                className="bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
              >
                {totalPages}
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-400 hover:bg-gray-700"
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
        </nav>
      </div>
    </div>
  );
}
