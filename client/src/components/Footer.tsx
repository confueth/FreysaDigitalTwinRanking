import React from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 py-4 px-6 text-center text-gray-300">
      <div className="container mx-auto flex flex-col md:flex-row justify-center items-center gap-2">
        <div className="flex items-center">
          <span>Developed with</span>
          <Heart className="h-4 w-4 mx-1 text-red-500 animate-pulse" />
          <span>by</span>
          <a 
            href="https://x.com/confu_eth" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mx-1 font-medium text-purple-400 hover:text-purple-300 transition-colors"
          >
            Confu.eth
          </a>
          <span>for the</span>
        </div>
        <a 
          href="https://freysa.ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Freysa.ai
        </a>
        <span>community</span>
      </div>
    </footer>
  );
}