import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, BarChart2, Menu, X, Users, Earth, Home, ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  const [location] = useLocation();
  
  const viewLabels = {
    'table': 'Table View',
    'cards': 'Card View',
    'timeline': 'Timeline View'
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mobileMenuOpen && !target.closest('header')) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);
  
  // Close mobile menu on location change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 backdrop-blur-sm bg-opacity-90 shadow-md">
      <div className="container-responsive py-3">
        {/* Desktop Header Layout */}
        <div className="hidden md:flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary border-2 border-primary ring-2 ring-green-500 glow animate-pulse-green shadow-lg">
                <img 
                  src={FreysaImage}
                  alt="Freysa" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h1 className="text-xl font-bold text-gradient-animated">
                Freysa Leaderboard
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://freysa.ai/digital-twin?ref=Navali" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg btn-hover"
              title="Create your own Digital Twin with referral"
            >
              Create your Digital Twin
            </a>
            
            <Link to="/my-agents">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1 shadow-sm hover:shadow btn-hover"
              >
                <Users className="h-4 w-4" />
                <span>My Agents</span>
              </Button>
            </Link>
            
            <Link to="/analytics">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1 shadow-sm hover:shadow btn-hover"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Analytics</span>
              </Button>
            </Link>

            <Link to="/city-stats">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1 shadow-sm hover:shadow btn-hover"
              >
                <Earth className="h-4 w-4" />
                <span>City Stats</span>
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-gray-800 hover:bg-gray-700 border-gray-700 shadow-sm hover:shadow btn-hover">
                  <span>{viewLabels[selectedView]}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border border-gray-700 text-white shadow-lg animate-fade-in-down">
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
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary border-2 border-primary ring-1 ring-green-500 glow animate-pulse-green shadow-md">
                <img 
                  src={FreysaImage}
                  alt="Freysa" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h1 className="text-sm font-bold text-gradient-blue-purple truncate max-w-[180px]">
                Freysa Leaderboard
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-800 hover:bg-gray-700 border-gray-700 p-1 h-8 w-8 touch-target"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border border-gray-700 text-white w-56 shadow-lg animate-reveal-scale">
                <div className="px-2 py-1.5 text-xs font-medium text-blue-400">View Options</div>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => onViewChange('table')}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedView === 'table' ? 'bg-blue-500 animate-pulse-soft' : 'bg-gray-600'}`}></div>
                  Table View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => onViewChange('cards')}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedView === 'cards' ? 'bg-blue-500 animate-pulse-soft' : 'bg-gray-600'}`}></div>
                  Card View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => onViewChange('timeline')}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedView === 'timeline' ? 'bg-blue-500 animate-pulse-soft' : 'bg-gray-600'}`}></div>
                  Timeline View
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <div className="px-2 py-1.5 text-xs font-medium text-green-400">Navigation</div>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  asChild
                >
                  <Link to="/" className="w-full">
                    <Home className="h-4 w-4 mr-1.5" />
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  asChild
                >
                  <Link to="/my-agents" className="w-full">
                    <Users className="h-4 w-4 mr-1.5" />
                    My Agents
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  asChild
                >
                  <Link to="/analytics" className="w-full">
                    <BarChart2 className="h-4 w-4 mr-1.5" />
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  asChild
                >
                  <Link to="/city-stats" className="w-full">
                    <Earth className="h-4 w-4 mr-1.5" />
                    City Stats
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem 
                  className="hover:bg-gray-700 flex items-center gap-2"
                  asChild
                >
                  <a 
                    href="https://freysa.ai/digital-twin?ref=Navali" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full"
                    title="Create your own Digital Twin with referral"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1.5" />
                    Create Digital Twin
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1 h-8 w-8 text-white touch-target"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-gray-800 mt-3 animate-slide-in-right">
            <div className="mb-4">
              <h3 className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wider">View Mode</h3>
              <div className="flex flex-row items-center space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                <Button
                  variant={selectedView === 'table' ? 'default' : 'outline'}
                  size="sm"
                  className={`${selectedView === 'table' ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-gray-800'} border-gray-700 whitespace-nowrap touch-target`}
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
                  className={`${selectedView === 'cards' ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-gray-800'} border-gray-700 whitespace-nowrap touch-target`}
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
                  className={`${selectedView === 'timeline' ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : 'bg-gray-800'} border-gray-700 whitespace-nowrap touch-target`}
                  onClick={() => {
                    onViewChange('timeline');
                    setMobileMenuOpen(false);
                  }}
                >
                  Timeline View
                </Button>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-xs font-medium text-green-400 mb-2 uppercase tracking-wider">Navigation</h3>
              <div className="space-y-2">
                <Link to="/" className="w-full">
                  <Button 
                    variant="ghost"
                    className="w-full justify-start hover:bg-gray-800 text-gray-300 hover:text-white mobile-nav-button touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Home className="h-4 w-4 mr-3" />
                    <span>Home</span>
                  </Button>
                </Link>
                
                <Link to="/my-agents" className="w-full">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start hover:bg-gray-800 text-gray-300 hover:text-white mobile-nav-button touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="h-4 w-4 mr-3" />
                    <span>My Agents</span>
                  </Button>
                </Link>
                
                <Link to="/analytics" className="w-full">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start hover:bg-gray-800 text-gray-300 hover:text-white mobile-nav-button touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BarChart2 className="h-4 w-4 mr-3" />
                    <span>Analytics</span>
                  </Button>
                </Link>
                
                <Link to="/city-stats" className="w-full">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start hover:bg-gray-800 text-gray-300 hover:text-white mobile-nav-button touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Earth className="h-4 w-4 mr-3" />
                    <span>City Stats</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="mt-4 w-full">
              <a 
                href="https://freysa.ai/digital-twin?ref=Navali" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center text-sm px-3 py-2.5 rounded-md bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg touch-target"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  <span>Create your Digital Twin</span>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
