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
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
          <Skeleton className="h-20 bg-gray-800 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
        {/* Game Status Section */}
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white mb-3">Game Status</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-yellow-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">Prize Pool</p>
                  <h3 className="text-xl font-bold">${formatNumber(gameStatus?.prizePool || 0, true)}</h3>
                </div>
                <div className="rounded-full bg-yellow-500 bg-opacity-20 p-1.5">
                  <Award className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              <div className="mt-1 flex items-center text-xs">
                <span className="text-gray-400">{formatNumber(gameStatus?.prizePoolEth || 0)} ETH</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-green-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">ETH/USD Price</p>
                  <h3 className="text-xl font-bold">${formatNumber(gameStatus?.ethUsdPrice || 0, true)}</h3>
                </div>
                <div className="rounded-full bg-green-500 bg-opacity-20 p-1.5">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="mt-1 flex items-center text-xs">
                <span className="text-gray-400">Current price</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-blue-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">Entry Price</p>
                  <h3 className="text-xl font-bold">{gameStatus?.entryPriceInEth || 0} ETH</h3>
                </div>
                <div className="rounded-full bg-blue-500 bg-opacity-20 p-1.5">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <div className="mt-1 flex items-center text-xs text-gray-400">
                <span>≈ ${formatCurrency(gameStatus ? gameStatus.entryPriceInEth * gameStatus.ethUsdPrice : 0, true)}</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-red-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">Game Ends</p>
                  <h3 className="text-lg font-bold truncate" id="gameEnds">{gameStatus?.endsAt ? formatDate(gameStatus.endsAt, 'game-ends', true) : 'TBD'}</h3>
                </div>
                <div className="rounded-full bg-red-500 bg-opacity-20 p-1.5">
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
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white mb-3">Leaderboard Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-blue-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">Total Agents</p>
                  <h3 className="text-xl font-bold" id="totalAgents">{stats?.totalAgents || 0}</h3>
                </div>
                <div className="rounded-full bg-blue-500 bg-opacity-20 p-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <div className="mt-1 flex items-center text-xs">
                <span className="text-gray-400">Active players</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-purple-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">Avg Score</p>
                  <h3 className="text-xl font-bold" id="avgScore">{formatNumber(stats?.avgScore || 0)}</h3>
                </div>
                <div className="rounded-full bg-purple-500 bg-opacity-20 p-1.5">
                  <BarChart2 className="h-4 w-4 text-purple-500" />
                </div>
              </div>
              <div className="mt-1 flex items-center text-xs">
                <span className="text-gray-400">Across all agents</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-green-500/30 transition-colors duration-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-xs">Data Refresh Time</p>
                  <h3 className="text-sm sm:text-base font-bold" id="firstLoadTime">{formatDate(firstLoadTime || snapshotTime, 'short', true)}</h3>
                </div>
                <div className="rounded-full bg-green-500 bg-opacity-20 p-1.5">
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
    </div>
  );
}
