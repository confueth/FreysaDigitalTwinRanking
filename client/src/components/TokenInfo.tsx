import React from 'react';
import { formatWalletAddress } from '@/utils/formatters';
import { ExternalLink, Shield, Users, Image, Sparkles, ArrowUpRight } from 'lucide-react';

export default function TokenInfo() {
  const contractAddress = '0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935';
  
  return (
    <div className="data-card-premium mb-6 relative overflow-hidden group">
      {/* Animated shimmer effect overlay */}
      <div className="absolute inset-0 w-full h-full animate-shimmer opacity-30 pointer-events-none"></div>
      
      {/* Card content */}
      <div className="relative z-10">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gradient-animated">
          <Users className="h-5 w-5 mr-2 text-blue-400" />
          Freysa Community Info
          <Sparkles className="h-4 w-4 ml-2 text-blue-400 animate-pulse-soft" />
        </h2>
        
        <div className="space-y-5">
          <div className="transform transition-transform duration-300 hover:scale-105">
            <div className="text-gray-400 text-sm mb-1">Token</div>
            <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">$FAI</div>
          </div>
          
          <div className="transform transition-all duration-300 hover:translate-x-1">
            <div className="text-blue-300 text-sm mb-1 flex items-center">
              <Shield className="h-4 w-4 mr-1.5 text-blue-400" />
              <span>Contract (Base)</span>
            </div>
            <div className="flex items-center">
              <code className="bg-gray-800/70 px-3 py-1.5 rounded text-gray-300 text-sm font-mono flex-1 overflow-x-auto border border-blue-500/10">
                {contractAddress}
              </code>
              <a 
                href={`https://basescan.org/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:text-blue-300 transition-colors btn-hover"
                aria-label="View on BaseScan"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="text-gray-500 text-xs mt-1.5 italic">Stay safe, humans</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="transform transition-all duration-300 hover:translate-y-[-2px] group/item">
              <div className="text-blue-300 text-sm mb-1.5 flex items-center">
                {/* X Logo */}
                <svg 
                  viewBox="0 0 24 24" 
                  className="h-4 w-4 mr-1.5 text-blue-400 fill-current"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Official X Account</span>
              </div>
              <div>
                <a 
                  href="https://x.com/freysa_ai" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center link-hover-bright"
                >
                  @Freysa_AI
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>
    
            <div className="transform transition-all duration-300 hover:translate-y-[-2px] group/item">
              <div className="text-blue-300 text-sm mb-1.5 flex items-center">
                {/* Telegram Logo */}
                <svg 
                  viewBox="0 0 24 24" 
                  className="h-4 w-4 mr-1.5 text-blue-400 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.495 7.705l-1.974 9.36c-.15.787-.563.975-1.128.6l-3.137-2.313-1.537 1.5c-.15.15-.338.338-.675.338-.338 0-.287-.15-.412-.525l-.9-3H5.455c-.786-.15-.825-.786.188-1.2l9.586-3.71c.487-.188.975.113.826.975z" />
                </svg>
                <span>Community Telegram</span>
              </div>
              <div>
                <a 
                  href="https://t.me/FreysaAI_TG" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center link-hover-bright"
                >
                  FreysaAI_TG
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>
    
            <div className="transform transition-all duration-300 hover:translate-y-[-2px] group/item md:col-span-2">
              <div className="text-blue-300 text-sm mb-1.5 flex items-center">
                <Image className="h-4 w-4 mr-1.5 text-blue-400" />
                <span>NFT Collection</span>
              </div>
              <div className="flex items-center">
                <a 
                  href="https://opensea.io/collection/freysa-reflections-2049" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center link-hover-bright"
                >
                  2049 // Reflections
                  <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </a>
                <span className="ml-2 text-gray-500 text-xs">(OpenSea)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}