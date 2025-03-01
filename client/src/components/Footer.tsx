import React from 'react';
import { Heart, Code, Coffee } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 py-6 px-6 text-center text-gray-300">
      <div className="container mx-auto flex flex-col md:flex-row justify-center items-center gap-2">
        <div className="flex items-center flex-wrap justify-center">
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
          <a 
            href="https://freysa.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mx-1 font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-colors"
          >
            Freysa.ai
          </a>
          <span>community</span>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-400 flex items-center justify-center flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center">
          <Code className="h-3 w-3 mr-1" />
          <span>It begins with Freysa 🌱</span>
        </div>
        <a 
          href="https://github.com/confueth/FreysaDigitalTwinRanking" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-gray-300 transition-colors flex items-center"
        >
          <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
          </svg>
          <span>Source Code</span>
        </a>
        
      </div>
    </footer>
  );
}