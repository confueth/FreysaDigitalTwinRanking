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
            className="card-hover bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500/50 cursor-pointer shadow-lg shadow-black/30 hover:shadow-blue-500/20"
            onClick={() => onAgentSelect(agent.mastodonUsername)}
          >
            <div className="relative">
              <div className="absolute top-0 left-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 text-sm font-bold rounded-br-lg z-10">
                Rank #{agent.rank}
              </div>
              <div className="h-32 bg-gradient-to-r from-gray-900 via-purple-900/30 to-blue-900/40 relative overflow-hidden">
                {agent.prevRank && agent.prevRank > agent.rank && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    ↑{agent.prevRank - agent.rank}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 transform translate-y-1/2 left-4">
                <div className="relative">
                  <img 
                    className="h-16 w-16 rounded-full border-4 border-gray-800 hover:border-blue-500/50 transition-colors duration-300" 
                    src={agent.avatarUrl || `https://ui-avatars.com/api/?name=${agent.mastodonUsername}&background=random`} 
                    alt={`@${agent.mastodonUsername}`}
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse-soft"></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 pt-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors duration-300">@{agent.mastodonUsername}</h3>
                  <p className="text-gray-400 text-sm">{agent.city || 'Unknown Location'}</p>
                </div>
                <div className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-800">
                  <div className="text-sm font-semibold">{formatNumber(agent.score)}</div>
                  {agent.prevScore && (
                    <div className={`text-xs ${agent.score > agent.prevScore ? 'text-green-500' : 'text-red-500'}`}>
                      {agent.score > agent.prevScore 
                        ? <span className="flex items-center">↑ {formatNumber(agent.score - agent.prevScore)}</span> 
                        : <span className="flex items-center">↓ {formatNumber(Math.abs(agent.score - agent.prevScore))}</span>}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-900 rounded-lg p-2 border border-gray-800 hover:border-blue-500/30 transition-colors duration-300">
                  <p className="text-gray-400 text-xs">Followers</p>
                  <p className="font-semibold">{formatCompactNumber(agent.followersCount)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 border border-gray-800 hover:border-blue-500/30 transition-colors duration-300">
                  <p className="text-gray-400 text-xs">Likes</p>
                  <p className="font-semibold">{formatCompactNumber(agent.likesCount)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 border border-gray-800 hover:border-blue-500/30 transition-colors duration-300">
                  <p className="text-gray-400 text-xs">Retweets</p>
                  <p className="font-semibold">{formatCompactNumber(agent.retweetsCount)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent count and pagination */}
      <div className="mt-6 flex flex-col items-center space-y-4">
        <p className="text-sm text-gray-400">
          Showing <span className="font-medium text-blue-400">{(currentPage - 1) * pageSize + 1}</span> to{' '}
          <span className="font-medium text-blue-400">{Math.min(currentPage * pageSize, totalAgents)}</span> of{' '}
          <span className="font-medium text-blue-400">{totalAgents}</span> agents
        </p>
        <nav className="relative z-0 inline-flex rounded-lg shadow-md" aria-label="Pagination">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className={`relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-700 
              ${currentPage <= 1 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 text-blue-400 hover:bg-gray-700 hover:text-blue-300 btn-hover'
              }`}
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
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
                  isCurrentPage 
                    ? 'z-10 bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500 text-white shadow-md'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-blue-300 btn-hover'
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
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-blue-300 btn-hover relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200"
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
            className={`relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-700 
              ${currentPage >= totalPages 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 text-blue-400 hover:bg-gray-700 hover:text-blue-300 btn-hover'
              }`}
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
