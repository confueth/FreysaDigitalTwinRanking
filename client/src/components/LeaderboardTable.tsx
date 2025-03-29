import React from 'react';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';

interface LeaderboardTableProps {
  agents: Agent[];
  onAgentSelect: (username: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalAgents: number;
  pageSize: number;
  isLoading: boolean;
  savedAgents?: string[]; // Optional array of saved agent usernames to highlight
  onToggleSaveAgent?: (username: string) => void; // Optional callback to toggle save/unsave
}

export default function LeaderboardTable({
  agents,
  onAgentSelect,
  currentPage,
  onPageChange,
  totalAgents,
  pageSize,
  isLoading,
  savedAgents = [],
  onToggleSaveAgent
}: LeaderboardTableProps) {
  // Calculate total pages
  const totalPages = Math.ceil(totalAgents / pageSize);
  const isMobile = useIsMobile();

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
                <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">City</TableHead>
                <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</TableHead>
                <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Likes</TableHead>
                <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Retweets</TableHead>
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
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20 bg-gray-700" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 bg-gray-700" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 bg-gray-700" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 bg-gray-700" /></TableCell>
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

  // Responsive column rendering
  const renderMobileTableRow = (agent: Agent, index: number) => {
    const isSaved = savedAgents.includes(agent.mastodonUsername);

    return (
      <TableRow 
        key={agent.id} 
        className={`hover:bg-gray-700 cursor-pointer ${isSaved ? 'bg-emerald-900/20' : ''}`}
        onClick={() => onAgentSelect(agent.mastodonUsername)}
      >
        <TableCell className="px-2 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <span className="text-base font-semibold">{agent.rank}</span>
            {agent.prevRank && agent.rank !== agent.prevRank && (
              <span className={`ml-1 text-xs ${getRankChangeClass(agent.rank, agent.prevRank)}`}>
                {agent.prevRank > agent.rank ? `+${agent.prevRank - agent.rank}` : `${agent.prevRank - agent.rank}`}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="px-2 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <img 
              className="h-7 w-7 rounded-full"
              src={agent.avatarUrl || `https://ui-avatars.com/api/?name=${agent.mastodonUsername}&background=random`}
              alt={`${agent.mastodonUsername} avatar`}
            />
            <div className="ml-2">
              <div className="flex items-center">
                <span className="text-xs font-medium">@{agent.mastodonUsername.length > 12 ? 
                  `${agent.mastodonUsername.substring(0, 10)}...` : agent.mastodonUsername}</span>
                {isSaved && <span className="ml-1 text-xs text-emerald-400">★</span>}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-2 py-3 whitespace-nowrap">
          <div className="text-xs font-semibold">{formatCompactNumber(agent.score)}</div>
          {agent.prevScore !== undefined && agent.score !== agent.prevScore && (
            <div className={`text-xs ${getScoreChangeClass(agent.score, agent.prevScore)}`}>
              {agent.score === agent.prevScore ? (
                <span>0</span>
              ) : agent.score > agent.prevScore ? (
                <span>+{formatNumber(agent.score - agent.prevScore)}</span>
              ) : (
                <span>-{formatNumber(Math.abs(agent.score - agent.prevScore))}</span>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="px-2 py-3 whitespace-nowrap text-right">
          <div className="flex justify-end space-x-1">
            {/* Save/Unsave button */}
            {onToggleSaveAgent && (
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 h-7 w-7 ${isSaved ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSaveAgent(agent.mastodonUsername);
                }}
              >
                <span className="text-base">{isSaved ? '★' : '☆'}</span>
                <span className="sr-only">{isSaved ? 'Remove from saved' : 'Save agent'}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary-dark p-1 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onAgentSelect(agent.mastodonUsername);
              }}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderDesktopTableRow = (agent: Agent, index: number) => {
    const isSaved = savedAgents.includes(agent.mastodonUsername);

    return (
      <TableRow 
        key={agent.id} 
        className={`hover:bg-gray-700 cursor-pointer ${isSaved ? 'bg-emerald-900/20' : ''}`}
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
              <div className="flex items-center">
                <div className="text-sm font-medium">@{agent.mastodonUsername}</div>
                {isSaved && <span className="ml-2 text-xs text-emerald-400">★</span>}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 whitespace-nowrap">
          <div className="text-sm font-semibold">{formatNumber(agent.score)}</div>
          {agent.prevScore !== undefined && agent.score !== agent.prevScore && (
            <div className={`text-xs ${getScoreChangeClass(agent.score, agent.prevScore)}`}>
              {agent.score === agent.prevScore ? (
                <span>0</span>
              ) : agent.score > agent.prevScore ? (
                <span>+{formatNumber(agent.score - agent.prevScore)}</span>
              ) : (
                <span>-{formatNumber(Math.abs(agent.score - agent.prevScore))}</span>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="hidden md:table-cell px-4 py-3 whitespace-nowrap">
          <div className="text-sm">{agent.city || '-'}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell px-4 py-3 whitespace-nowrap">
          <div className="text-sm">{formatCompactNumber(agent.followersCount)}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell px-4 py-3 whitespace-nowrap">
          <div className="text-sm">{formatCompactNumber(agent.likesCount)}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell px-4 py-3 whitespace-nowrap">
          <div className="text-sm">{formatCompactNumber(agent.retweetsCount)}</div>
        </TableCell>
        <TableCell className="px-4 py-3 whitespace-nowrap text-right">
          <div className="flex justify-end space-x-2">
            {/* Save/Unsave button */}
            {onToggleSaveAgent && (
              <Button
                variant="ghost"
                size="icon"
                className={`${isSaved ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSaveAgent(agent.mastodonUsername);
                }}
              >
                <span className="text-xl">{isSaved ? '★' : '☆'}</span>
                <span className="sr-only">{isSaved ? 'Remove from saved' : 'Save agent'}</span>
              </Button>
            )}

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
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-6">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-900">
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</TableHead>
              <TableHead className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</TableHead>
              <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">City</TableHead>
              <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</TableHead>
              <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Likes</TableHead>
              <TableHead className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Retweets</TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr]:border-b [&>tr]:border-gray-700 [&>tr:first-child]:border-t [&>tr:first-child]:border-gray-700">
            {agents.map((agent, index) => (
              isMobile 
                ? renderMobileTableRow(agent, index)
                : renderDesktopTableRow(agent, index)
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        {/* Mobile pagination */}
        <div className="flex-1 flex justify-between items-center sm:hidden">
          <div className="text-xs text-gray-400 mr-2">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-0 w-8 h-8 border border-gray-700 text-sm rounded-md text-white bg-gray-800 hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-0 w-8 h-8 border border-gray-700 text-sm rounded-md text-white bg-gray-800 hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop pagination */}
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, totalAgents)}</span> of{' '}
              <span className="font-medium">{totalAgents}</span> Digital Twins
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
                <ChevronLeft className="h-4 w-4" />
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
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}