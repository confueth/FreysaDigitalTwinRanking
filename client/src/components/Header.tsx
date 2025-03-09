import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, BarChart2, Menu, X, Users } from 'lucide-react';
import { Link } from 'wouter';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import FreysaImage from '../assets/profile-freysa-original.jpg';

interface HeaderProps {
  selectedView: 'table' | 'cards' | 'timeline';
  onViewChange: (view: 'table' | 'cards' | 'timeline') => void;
}

export default function Header({ selectedView, onViewChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const viewLabels = {
    'table': 'Table View',
    'cards': 'Card View',
    'timeline': 'Timeline View'
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        {/* Desktop Header Layout */}
        <div className="hidden md:flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary border-2 border-primary ring-2 ring-green-500 glow animate-pulse-green">
                <img 
                  src={FreysaImage}
                  alt="Freysa" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                Freysa Leaderboard
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://freysa.ai/digital-twin?ref=Navali" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
              title="Create your own Digital Twin with referral"
            >
              Create your Digital Twin
            </a>
            
            <Link to="/my-agents">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1"
              >
                <Users className="h-4 w-4" />
                <span>My Agents</span>
              </Button>
            </Link>
            
            <Link to="/analytics">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Analytics</span>
              </Button>
            </Link>

            <Link to="/city-stats">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>City Stats</span>
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-gray-800 hover:bg-gray-700 border-gray-700">
                  <span>{viewLabels[selectedView]}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border border-gray-700 text-white">
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  onClick={() => onViewChange('table')}
                >
                  Table View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  onClick={() => onViewChange('cards')}
                >
                  Card View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  onClick={() => onViewChange('timeline')}
                >
                  Timeline View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Mobile Header Layout */}
        <div className="md:hidden flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary border-2 border-primary ring-1 ring-green-500 glow animate-pulse-green">
                <img 
                  src={FreysaImage}
                  alt="Freysa" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent truncate max-w-[180px]">
                Freysa Leaderboard
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-gray-800 hover:bg-gray-700 border-gray-700 p-1 h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border border-gray-700 text-white">
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  onClick={() => onViewChange('table')}
                >
                  Table View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  onClick={() => onViewChange('cards')}
                >
                  Card View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  onClick={() => onViewChange('timeline')}
                >
                  Timeline View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  asChild
                >
                  <Link to="/my-agents" className="w-full">
                    My Agents
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  asChild
                >
                  <Link to="/analytics" className="w-full">
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  asChild
                >
                  <Link to="/city-stats" className="w-full">
                    City Stats
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700"
                  asChild
                >
                  <a 
                    href="https://freysa.ai/digital-twin?ref=Navali" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full"
                    title="Create your own Digital Twin with referral"
                  >
                    Create Twin
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 h-8 w-8 text-white"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-gray-800 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedView === 'table' ? 'default' : 'outline'}
                size="sm"
                className={`${selectedView === 'table' ? 'bg-primary' : 'bg-gray-800'} border-gray-700`}
                onClick={() => {
                  onViewChange('table');
                  setMobileMenuOpen(false);
                }}
              >
                Table View
              </Button>
              
              <Button
                variant={selectedView === 'cards' ? 'default' : 'outline'}
                size="sm"
                className={`${selectedView === 'cards' ? 'bg-primary' : 'bg-gray-800'} border-gray-700`}
                onClick={() => {
                  onViewChange('cards');
                  setMobileMenuOpen(false);
                }}
              >
                Card View
              </Button>
              
              <Button
                variant={selectedView === 'timeline' ? 'default' : 'outline'}
                size="sm"
                className={`${selectedView === 'timeline' ? 'bg-primary' : 'bg-gray-800'} border-gray-700`}
                onClick={() => {
                  onViewChange('timeline');
                  setMobileMenuOpen(false);
                }}
              >
                Timeline View
              </Button>
              
              <Link to="/my-agents" className="w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center justify-center gap-1 w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="h-4 w-4" />
                  <span>My Agents</span>
                </Button>
              </Link>
              
              <Link to="/analytics" className="w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center justify-center gap-1 w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>Analytics</span>
                </Button>
              </Link>
              
              <Link to="/city-stats" className="w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center justify-center gap-1 w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>City Stats</span>
                </Button>
              </Link>
            </div>
            
            <div className="mt-3 w-full">
              <a 
                href="https://freysa.ai/digital-twin?ref=Navali" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center text-sm px-3 py-2 rounded-md bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Create your Digital Twin
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
