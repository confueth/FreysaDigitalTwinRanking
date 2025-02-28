import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
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
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17.25V11h4.75m0 0l-4-4m4 4l-4 4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <h1 className="text-xl font-bold">Freysa Game Leaderboard</h1>
        </div>
        
        <div className="flex items-center">
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
