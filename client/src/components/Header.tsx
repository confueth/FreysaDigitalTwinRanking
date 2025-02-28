import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, BarChart2 } from 'lucide-react';
import { Link } from 'wouter';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  selectedView: 'table' | 'cards' | 'timeline';
  onViewChange: (view: 'table' | 'cards' | 'timeline') => void;
}

export default function Header({ selectedView, onViewChange }: HeaderProps) {
  const viewLabels = {
    'table': 'Table View',
    'cards': 'Card View',
    'timeline': 'Timeline View'
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <a 
            href="https://www.freysa.ai/digital-twin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
            title="Visit Freysa Digital Twin website"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary border-2 border-primary ring-2 ring-green-500 glow">
              <img 
                src="/images/profile-freysa-original.jpg" 
                alt="Freysa" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
              Freysa Digital Twin Leaderboard
            </h1>
          </a>
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
    </header>
  );
}
