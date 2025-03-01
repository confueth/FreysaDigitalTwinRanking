import { Users, BarChart2, Clock, TrendingUp, Award, DollarSign, Calendar } from 'lucide-react';
import { SnapshotStats } from '@/types/agent';
import { formatNumber, formatRelativeTime, formatDate, formatCurrency } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameStatus } from '@/hooks/use-game-status';
import { useState } from 'react';

interface StatCardsProps {
  stats?: SnapshotStats;
  snapshotTime: string;
  isLoading: boolean;
}

export default function StatCards({ stats, snapshotTime, isLoading }: StatCardsProps) {
  const [showGameStatus, setShowGameStatus] = useState(false);
  const { data: gameStatus, isLoading: isGameStatusLoading } = useGameStatus();
  
  const toggleView = () => {
    setShowGameStatus(prev => !prev);
  };

  if (isLoading || isGameStatusLoading) {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Skeleton className="h-24 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 bg-gray-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 bg-gray-800 rounded-lg" />
          <Skeleton className="h-24 bg-gray-800 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{showGameStatus ? 'Game Status' : 'Leaderboard Stats'}</h2>
        <button 
          onClick={toggleView} 
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center"
        >
          Show {showGameStatus ? 'Leaderboard Stats' : 'Game Status'}
        </button>
      </div>

      {showGameStatus ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">Prize Pool</p>
                <h3 className="text-2xl font-bold">${formatNumber(gameStatus?.prizePool || 0)}</h3>
              </div>
              <div className="rounded-full bg-yellow-500 bg-opacity-20 p-2">
                <Award className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-gray-400">{formatNumber(gameStatus?.prizePoolEth || 0)} ETH</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">ETH/USD Price</p>
                <h3 className="text-2xl font-bold">${formatNumber(gameStatus?.ethUsdPrice || 0)}</h3>
              </div>
              <div className="rounded-full bg-green-500 bg-opacity-20 p-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-gray-400">Current market price</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">Entry Price</p>
                <h3 className="text-2xl font-bold">{gameStatus?.entryPriceInEth || 0} ETH</h3>
              </div>
              <div className="rounded-full bg-blue-500 bg-opacity-20 p-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-400">
              <span>≈ ${formatCurrency(gameStatus ? gameStatus.entryPriceInEth * gameStatus.ethUsdPrice : 0)}</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">Game Ends</p>
                <h3 className="text-xl font-bold" id="gameEnds">{gameStatus?.endsAt ? formatDate(gameStatus.endsAt) : 'TBD'}</h3>
              </div>
              <div className="rounded-full bg-red-500 bg-opacity-20 p-2">
                <Calendar className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-400">
              <span>{gameStatus?.endsAt ? formatRelativeTime(gameStatus.endsAt) : 'Date not set'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">Total Agents</p>
                <h3 className="text-2xl font-bold" id="totalAgents">{stats?.totalAgents || 0}</h3>
              </div>
              <div className="rounded-full bg-blue-500 bg-opacity-20 p-2">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-gray-400">Active players</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">Avg Score</p>
                <h3 className="text-2xl font-bold" id="avgScore">{formatNumber(stats?.avgScore || 0)}</h3>
              </div>
              <div className="rounded-full bg-purple-500 bg-opacity-20 p-2">
                <BarChart2 className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className="text-gray-400">Average score across all agents</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm">Snapshot Time</p>
                <h3 className="text-2xl font-bold" id="snapshotTime">{snapshotTime}</h3>
              </div>
              <div className="rounded-full bg-green-500 bg-opacity-20 p-2">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-400">
              <span>Last update {formatRelativeTime(snapshotTime)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
