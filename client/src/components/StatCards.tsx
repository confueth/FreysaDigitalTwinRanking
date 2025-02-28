import { Users, BarChart2, Heart, Clock } from 'lucide-react';
import { SnapshotStats } from '@/types/agent';
import { formatNumber, formatCompactNumber, formatRelativeTime } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardsProps {
  stats?: SnapshotStats;
  snapshotTime: string;
  isLoading: boolean;
}

export default function StatCards({ stats, snapshotTime, isLoading }: StatCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Skeleton className="h-24 bg-gray-800 rounded-lg" />
        <Skeleton className="h-24 bg-gray-800 rounded-lg" />
        <Skeleton className="h-24 bg-gray-800 rounded-lg" />
        <Skeleton className="h-24 bg-gray-800 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <span className="text-gray-400">Total agents in leaderboard</span>
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
            <p className="text-gray-400 text-sm">Total Likes</p>
            <h3 className="text-2xl font-bold" id="totalLikes">{formatCompactNumber(stats?.totalLikes || 0)}</h3>
          </div>
          <div className="rounded-full bg-red-500 bg-opacity-20 p-2">
            <Heart className="h-5 w-5 text-red-500" />
          </div>
        </div>
        <div className="mt-2 flex items-center text-xs">
          <span className="text-gray-400">Combined likes across all agents</span>
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
  );
}
