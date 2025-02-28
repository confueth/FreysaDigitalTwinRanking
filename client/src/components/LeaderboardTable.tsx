import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Agent } from '@/types/agent';
import { 
  formatNumber, 
  formatCompactNumber, 
  getRankChangeClass, 
  getScoreChangeClass, 
  getChangeValue 
} from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardTableProps {
  agents: Agent[];
  onAgentSelect: (username: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalAgents: number;
  pageSize: number;
  isLoading: boolean;
}

export default function LeaderboardTable({
  agents,
  onAgentSelect,
  currentPage,
  onPageChange,
  totalAgents,
  pageSize,
  isLoading
}: LeaderboardTableProps) {
  // Calculate total pages
  const totalPages = Math.ceil(totalAgents / pageSize);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-900">
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</TableHead>
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</TableHead>
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</TableHead>
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">City</TableHead>
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</TableHead>
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Likes</TableHead>
                <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Retweets</TableHead>
                <TableHead className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-700">
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-6 w-8 bg-gray-700" /></TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
                      <Skeleton className="h-5 w-24 ml-3 bg-gray-700" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 bg-gray-700" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 bg-gray-700" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 bg-gray-700" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 bg-gray-700" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 bg-gray-700" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto bg-gray-700 rounded-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-6">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-900">
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">City</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Likes</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Retweets</TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-700">
            {agents.map((agent) => (
              <TableRow 
                key={agent.id} 
                className="hover:bg-gray-700 cursor-pointer"
                onClick={() => onAgentSelect(agent.mastodonUsername)}
              >
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold">{agent.rank}</span>
                    {agent.prevRank && agent.rank !== agent.prevRank && (
                      <span className={`ml-1 text-xs ${getRankChangeClass(agent.rank, agent.prevRank)}`}>
                        {agent.prevRank > agent.rank ? `+${agent.prevRank - agent.rank}` : `${agent.prevRank - agent.rank}`}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <img 
                      className="h-8 w-8 rounded-full"
                      src={agent.avatarUrl || `https://ui-avatars.com/api/?name=${agent.mastodonUsername}&background=random`}
                      alt={`${agent.mastodonUsername} avatar`}
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium">@{agent.mastodonUsername}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-semibold">{formatNumber(agent.score)}</div>
                  <div className={`text-xs ${getScoreChangeClass(agent.score, agent.prevScore)}`}>
                    {getChangeValue(agent.score, agent.prevScore)}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm">{agent.city || '-'}</div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm">{formatCompactNumber(agent.followersCount)}</div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm">{formatCompactNumber(agent.likesCount)}</div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm">{formatCompactNumber(agent.retweetsCount)}</div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:text-primary-dark"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAgentSelect(agent.mastodonUsername);
                    }}
                  >
                    <Eye className="h-5 w-5" />
                    <span className="sr-only">View</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700"
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, totalAgents)}</span> of{' '}
              <span className="font-medium">{totalAgents}</span> results
            </p>
          </div>
          <div>
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
      </div>
    </div>
  );
}
