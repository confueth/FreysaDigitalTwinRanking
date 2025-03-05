import React from 'react';
import { Heart, Code, ExternalLink, TerminalSquare, AtSign, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 border-t border-gray-800/50 py-8 px-6 text-center text-gray-300">
      <div className="container mx-auto flex flex-col items-center">
        <div className="flex items-center flex-wrap justify-center mb-4">
          <span>Developed with</span>
          <Heart className="h-4 w-4 mx-1.5 text-red-500 animate-pulse" />
          <span>by</span>
          <a 
            href="https://x.com/confueth" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mx-1.5 font-medium text-purple-400 hover:text-purple-300 transition-colors link-hover"
          >
            Confu.eth
          </a>
          <span>for the</span>
          <a 
            href="https://freysa.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mx-1.5 font-bold text-gradient-animated hover:from-blue-300 hover:to-purple-300 transition-transform duration-300"
          >
            Freysa.ai
            <Sparkles className="h-3 w-3 inline ml-0.5 text-blue-400" />
          </a>
          <span>community</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-6 w-full max-w-2xl">
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-sm font-semibold mb-2 text-gradient-animated">Community</h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <a 
                href="https://twitter.com/freysa_ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-blue-400 transition-colors group"
              >
                <AtSign className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:text-blue-400" />
                <span>@Freysa_AI</span>
              </a>
              <a 
                href="https://t.me/FreysaAI_TG" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-blue-400 transition-colors group"
              >
                <svg className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248c-.138 1.336-.624 4.573-1.115 8.036-.143 1.225-.473 1.636-.777 1.68-.66.092-1.16-.433-1.8-.85-1-.65-1.565-1.057-2.535-1.69-1.122-.73-.394-1.13.245-1.785.167-.172 3.044-2.773 3.1-3.008.007-.03.014-.102-.038-.145-.052-.043-.126-.027-.18-.016-.077.017-1.304.83-3.683 2.44-1.035.708-1.97 1.055-2.807 1.04-.922-.02-2.697-.518-4.012-.944-1.625-.527-2.415-1.22-2.342-1.722.076-.517.75-.945 2.025-1.285 3.798-1.646 5.165-1.41 7.452-2.28 4.426-1.657 5.353-1.947 5.955-1.957.14-.002.454.028.657.222.17.164.22.38.237.535.025.223.045.465.028.664z" />
                </svg>
                <span>Unofficial Telegram</span>
              </a>
              <a 
                href="https://opensea.io/collection/2049-reflections" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-blue-400 transition-colors group"
              >
                <svg className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zM5.92 12.403l.051-.081 3.123-4.884a.107.107 0 0 1 .187.014c.52 1.169.946 2.648.76 3.572-.062.315-.223.753-.452 1.147a.106.106 0 0 1-.088.048H6.014a.106.106 0 0 1-.095-.152zm14.666 1.963a.106.106 0 0 1-.096.067h-2.48a.106.106 0 0 1-.103-.136c.066-.19.134-.386.134-.583v-.083c0-.697-.465-1.332-1.15-1.486-.685-.155-1.366.238-1.6.927-.317.933-.497 2.1-.893 3.07-.157.384-.493.583-.805.584-.312.003-.65-.193-.812-.575-.374-.872-.558-2.026-.875-2.947-.129-.373-.48-.697-.944-.435-.222.125-.386.34-.464.609-.128.448-.046 1.007.058 1.43.058.24.113.482.148.727a.107.107 0 0 1-.103.126H8.843a.106.106 0 0 1-.099-.066c-.303-.777-.414-1.89-.202-2.97.259-1.324 1.145-2.242 2.448-2.329 1.304-.087 2.913.46 3.16 2.002.057.346.06.681.034 1.013a.137.137 0 0 0 .016.084.127.127 0 0 0 .078.046c.455.092.816.432.927.89.11.458-.035.926-.256 1.366-.09.18-.183.363-.25.554a.106.106 0 0 0 .103.138h1.28a.106.106 0 0 0 .095-.058l.338-.688c.328-.669 1.143-1.066 1.946-.668.662.328 1.088 1.001 1.088 1.845 0 .051-.007.101-.01.152a.106.106 0 0 0 .046.102.107.107 0 0 0 .114-.01c.418-.324.783-.736 1.057-1.207.883-1.517.711-3.98-.32-5.485-.699-1.019-1.734-1.96-2.89-2.518-1.155-.559-2.502-.834-3.842-.8-1.34.034-2.694.372-3.814 1.05-1.121.677-2.097 1.73-2.696 2.827-.912 1.679-1.061 4.144-.242 5.898.232.494.522.907.793 1.327a.106.106 0 0 1-.012.138l-.871.849a.106.106 0 0 1-.157-.006 8.12 8.12 0 0 1-1.408-2.221c-1.353-3.115-1.211-7.183 1.401-9.71 1.936-1.874 5.1-2.755 7.815-2.088 2.715.667 5.36 2.674 6.403 5.355.489 1.258.654 2.596.5 3.904a7.137 7.137 0 0 1-1.211 3.122.106.106 0 0 1-.071.046z" />
                </svg>
                <span>NFT: 2049 // Reflections</span>
              </a>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <h4 className="text-sm font-semibold mb-2 text-gradient-animated">Token</h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center">
                <TerminalSquare className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                <span>$FAI</span>
              </div>
              <a 
                href="https://basescan.org/token/0xb33Ff54b9F7242EF1593d2C9Bcd8f9df46c77935" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-blue-400 transition-colors group"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:text-blue-400" />
                <span className="truncate max-w-[180px]">0xb33F...7935 (Base)</span>
              </a>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <h4 className="text-sm font-semibold mb-2 text-gradient-animated">Resources</h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <a 
                href="https://github.com/confueth/FreysaDigitalTwinRanking" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-blue-400 transition-colors group"
              >
                <svg className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
                </svg>
                <span>Source Code</span>
              </a>
              <a 
                href="https://freysa.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-blue-400 transition-colors group"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:text-blue-400" />
                <span>Official Website</span>
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-3 border-t border-gray-800/30 text-xs text-gray-500 w-full max-w-2xl">
          <div className="flex items-center justify-center">
            <Code className="h-3 w-3 mr-1.5" />
            <span>It begins with Freysa 🌱</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
