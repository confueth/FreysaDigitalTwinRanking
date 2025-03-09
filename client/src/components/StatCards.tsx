import { Users, BarChart2, Clock, TrendingUp, Award, DollarSign, Calendar } from 'lucide-react';
import { SnapshotStats } from '@/types/agent';
import { formatNumber, formatRelativeTime, formatDate, formatCurrency } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameStatus } from '@/hooks/use-game-status';

interface StatCardsProps {
  stats?: SnapshotStats;
  snapshotTime: string;
  firstLoadTime?: string | null;
  isLoading: boolean;
}

export default function StatCards({ stats, snapshotTime, firstLoadTime, isLoading }: StatCardsProps) {
  const { data: gameStatus, isLoading: isGameStatusLoading } = useGameStatus();

  if (isLoading || isGameStatusLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg hidden xs:block md:block" />
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg hidden md:block" />
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 xs:h-20 bg-gray-800 rounded-lg hidden md:block" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Game Status Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 px-1">Game Status</h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">Prize Pool</p>
                <h3 className="text-xl font-bold">${formatNumber(gameStatus?.prizePool || 0, true)}</h3>
              </div>
              <div className="rounded-full bg-yellow-500 bg-opacity-20 p-2">
                <Award className="h-4 w-4 text-yellow-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-gray-400">{formatNumber(gameStatus?.prizePoolEth || 0)} ETH</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">ETH/USD Price</p>
                <h3 className="text-xl font-bold">${formatNumber(gameStatus?.ethUsdPrice || 0, true)}</h3>
              </div>
              <div className="rounded-full bg-green-500 bg-opacity-20 p-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-gray-400">Current price</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">Entry Price</p>
                <h3 className="text-xl font-bold">{gameStatus?.entryPriceInEth || 0} ETH</h3>
              </div>
              <div className="rounded-full bg-blue-500 bg-opacity-20 p-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-400">
              <span>≈ ${formatCurrency(gameStatus ? gameStatus.entryPriceInEth * gameStatus.ethUsdPrice : 0, true)}</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">Game Ends</p>
                <h3 className="text-lg font-bold truncate" id="gameEnds">{gameStatus?.endsAt ? formatDate(gameStatus.endsAt, 'game-ends', true) : 'TBD'}</h3>
              </div>
              <div className="rounded-full bg-red-500 bg-opacity-20 p-2">
                <Calendar className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-400">
              <span>{gameStatus?.endsAt ? formatRelativeTime(gameStatus.endsAt) : 'Date not set'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Stats Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 px-1">Leaderboard Stats</h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">Total Agents</p>
                <h3 className="text-xl font-bold" id="totalAgents">{stats?.totalAgents || 0}</h3>
              </div>
              <div className="rounded-full bg-blue-500 bg-opacity-20 p-2">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-gray-400">Active players</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs">Avg Score</p>
                <h3 className="text-xl font-bold" id="avgScore">{formatNumber(stats?.avgScore || 0)}</h3>
              </div>
              <div className="rounded-full bg-purple-500 bg-opacity-20 p-2">
                <BarChart2 className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-gray-400">Across all agents</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start">
              <div className="pr-2">
                <p className="text-gray-400 text-xs">Last Data Refresh</p>
                <h3 className="text-base font-bold" id="firstLoadTime">{formatDate(firstLoadTime || snapshotTime, 'short', true)}</h3>
              </div>
              <div className="rounded-full bg-green-500 bg-opacity-20 p-2 flex-shrink-0">
                <Clock className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs text-gray-400">
              <span>{formatRelativeTime(firstLoadTime || snapshotTime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
