import React from 'react';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { Trophy, TrendingUp, Users, Award, Sparkles, Zap, Clock, Flame, Timer } from 'lucide-react';
import { useGameStatus } from '@/hooks/use-game-status';
import { Skeleton } from '@/components/ui/skeleton';

export default function GameInfo() {
  const { data: gameStatus, isLoading, error } = useGameStatus();
  
  // Log the API response for debugging
  console.log("Game status data:", gameStatus);
  
  // Calculate days remaining
  const endDate = gameStatus ? new Date(gameStatus.endsAt) : new Date();
  const today = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="data-card-premium mb-6 relative overflow-hidden group">
      {/* Animated shimmer effect overlay */}
      <div className="absolute inset-0 w-full h-full animate-shimmer opacity-30 pointer-events-none"></div>
      
      {/* Card content */}
      <div className="relative z-10">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gradient-animated">
          <Trophy className="h-5 w-5 mr-2 text-blue-400" />
          Freysa Game Statistics
          <Sparkles className="h-4 w-4 ml-2 text-blue-400 animate-pulse-soft" />
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6">
            Unable to load game data. Please try again later.
          </div>
        ) : gameStatus ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
                <div className="text-gray-400 text-xs mb-1 flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1 text-blue-400" />
                  <span>Total Players</span>
                </div>
                <div className="text-lg font-bold text-white">{formatNumber(gameStatus.population)}</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
                <div className="text-gray-400 text-xs mb-1 flex items-center">
                  <TrendingUp className="h-3.5 w-3.5 mr-1 text-blue-400" />
                  <span>ETH Price</span>
                </div>
                <div className="text-lg font-bold text-white">{formatCurrency(gameStatus.ethUsdPrice)}</div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
                <div className="text-gray-400 text-xs mb-1 flex items-center">
                  <Award className="h-3.5 w-3.5 mr-1 text-blue-400" />
                  <span>Prize Pool</span>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {formatCurrency(gameStatus.prizePool, true)}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
                <div className="text-gray-400 text-xs mb-1 flex items-center">
                  <Timer className="h-3.5 w-3.5 mr-1 text-blue-400" />
                  <span>Days Remaining</span>
                </div>
                <div className="text-lg font-bold text-white">{daysRemaining > 0 ? daysRemaining : 0}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4 transform transition-all duration-300 hover:bg-gray-800/40 border border-blue-500/5 hover:border-blue-500/20">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 mr-2 text-blue-400" />
                  <h3 className="font-semibold text-gradient-blue-purple">Game Timing</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Entry Price</span>
                    <span className="font-medium text-white">{gameStatus.entryPriceInEth} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">UBI Claim End</span>
                    <span className="font-medium text-white">{new Date(gameStatus.ubiClaimTime).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Next UBI</span>
                    <span className="font-medium text-white">{new Date(gameStatus.nextUbiClaimTime).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/30 rounded-lg p-4 transform transition-all duration-300 hover:bg-gray-800/40 border border-blue-500/5 hover:border-blue-500/20">
                <div className="flex items-center mb-2">
                  <Flame className="h-5 w-5 mr-2 text-blue-400" />
                  <h3 className="font-semibold text-gradient-blue-purple">Prize Details</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">1st Place</span>
                    <span className="font-medium bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">{formatCurrency(gameStatus.prizePool)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Prize in ETH</span>
                    <span className="font-medium text-white">{typeof gameStatus.prizePoolEth === 'number' ? gameStatus.prizePoolEth.toFixed(2) : gameStatus.prizePoolEth} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">End Date</span>
                    <span className="font-medium text-white">{new Date(gameStatus.endsAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2 flex justify-center items-center py-2">
                <div className="text-sm text-gray-500 flex items-center">
                  <Zap className="h-4 w-4 mr-1.5 text-blue-500/70" />
                  <span>Game data is updated every 5 minutes</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}