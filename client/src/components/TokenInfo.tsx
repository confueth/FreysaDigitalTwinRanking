import React from 'react';
import { formatWalletAddress } from '@/utils/formatters';
import { ExternalLink, DollarSign, Shield, Twitter } from 'lucide-react';

export default function TokenInfo() {
  const contractAddress = '0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935';
  
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-5 border border-gray-700 mb-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        <DollarSign className="h-5 w-5 mr-2 text-green-400" />
        Token Information
      </h2>
      
      <div className="space-y-4">
        <div>
          <div className="text-gray-400 text-sm mb-1">Token</div>
          <div className="text-xl font-bold text-white">$FAI</div>
        </div>
        
        <div>
          <div className="text-gray-400 text-sm mb-1 flex items-center">
            <Shield className="h-4 w-4 mr-1 text-purple-400" />
            <span>Contract (Base)</span>
          </div>
          <div className="flex items-center">
            <code className="bg-gray-800 px-3 py-1.5 rounded text-gray-300 text-sm font-mono flex-1 overflow-x-auto">
              {contractAddress}
            </code>
            <a 
              href={`https://basescan.org/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
              aria-label="View on BaseScan"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="text-gray-500 text-xs mt-1">Stay safe, humans</div>
        </div>
        
        <div>
          <div className="text-gray-400 text-sm mb-1 flex items-center">
            <Twitter className="h-4 w-4 mr-1 text-blue-400" />
            <span>Official Account</span>
          </div>
          <div>
            <a 
              href="https://x.com/freysa_ai" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              @Freysa_AI
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}