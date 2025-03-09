import React from 'react';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { Trophy, TrendingUp, Users, Award, Sparkles, Zap, BrainCircuit, Flame, Timer } from 'lucide-react';

export default function TokenInfo() {
  // Mock data for game statistics
  const gameStats = {
    totalPlayers: 1238,
    totalPrizePool: 27500,
    avgPlayerScore: 908,
    topWinnerPrize: 5000,
    gameEndDate: "2025-04-01",
    aiCompletions: 583257,
    epochsCompleted: 3,
    totalReflections: 2049
  };
  
  // Calculate days remaining
  const endDate = new Date(gameStats.gameEndDate);
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
            <div className="text-gray-400 text-xs mb-1 flex items-center">
              <Users className="h-3.5 w-3.5 mr-1 text-blue-400" />
              <span>Total Players</span>
            </div>
            <div className="text-lg font-bold text-white">{formatNumber(gameStats.totalPlayers)}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
            <div className="text-gray-400 text-xs mb-1 flex items-center">
              <TrendingUp className="h-3.5 w-3.5 mr-1 text-blue-400" />
              <span>Avg Score</span>
            </div>
            <div className="text-lg font-bold text-white">{formatNumber(gameStats.avgPlayerScore)}</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
            <div className="text-gray-400 text-xs mb-1 flex items-center">
              <Award className="h-3.5 w-3.5 mr-1 text-blue-400" />
              <span>Prize Pool</span>
            </div>
            <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {formatCurrency(gameStats.totalPrizePool, true)}
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 transform transition-transform duration-300 hover:scale-105 border border-blue-500/10 hover:border-blue-500/30">
            <div className="text-gray-400 text-xs mb-1 flex items-center">
              <Timer className="h-3.5 w-3.5 mr-1 text-blue-400" />
              <span>Days Remaining</span>
            </div>
            <div className="text-lg font-bold text-white">{daysRemaining}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4 transform transition-all duration-300 hover:bg-gray-800/40 border border-blue-500/5 hover:border-blue-500/20">
            <div className="flex items-center mb-2">
              <BrainCircuit className="h-5 w-5 mr-2 text-blue-400" />
              <h3 className="font-semibold text-gradient-blue-purple">AI Performance</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Completions</span>
                <span className="font-medium text-white">{formatNumber(gameStats.aiCompletions)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Epochs</span>
                <span className="font-medium text-white">{gameStats.epochsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Reflections</span>
                <span className="font-medium text-white">{formatNumber(gameStats.totalReflections)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/30 rounded-lg p-4 transform transition-all duration-300 hover:bg-gray-800/40 border border-blue-500/5 hover:border-blue-500/20">
            <div className="flex items-center mb-2">
              <Flame className="h-5 w-5 mr-2 text-blue-400" />
              <h3 className="font-semibold text-gradient-blue-purple">Top Prizes</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">1st Place</span>
                <span className="font-medium bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">{formatCurrency(gameStats.topWinnerPrize)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">2nd Place</span>
                <span className="font-medium text-white">{formatCurrency(gameStats.topWinnerPrize * 0.6)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">3rd Place</span>
                <span className="font-medium text-white">{formatCurrency(gameStats.topWinnerPrize * 0.4)}</span>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2 flex justify-center items-center py-2">
            <div className="text-sm text-gray-500 flex items-center">
              <Zap className="h-4 w-4 mr-1.5 text-blue-500/70" />
              <span>Game data is updated hourly | Next update in 42 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}