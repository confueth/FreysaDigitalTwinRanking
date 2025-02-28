import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { AgentFilters } from '@/types/agent';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProps {
  filters: AgentFilters;
  onFilterChange: (filters: Partial<AgentFilters>) => void;
  cities: string[];
  isLoading: boolean;
}

export default function Sidebar({ 
  filters, 
  onFilterChange, 
  cities,
  isLoading
}: SidebarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [minScore, setMinScore] = useState<string>(filters.minScore?.toString() || '');
  const [maxScore, setMaxScore] = useState<string>(filters.maxScore?.toString() || '');
  const [city, setCity] = useState<string>(filters.city || 'all');
  const [sortBy, setSortBy] = useState<string>(filters.sortBy || 'score');

  // Handle search input
  const handleSearch = () => {
    onFilterChange({ search: searchValue });
  };

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle applying filters
  const handleApplyFilters = () => {
    onFilterChange({
      minScore: minScore ? parseInt(minScore) : undefined,
      maxScore: maxScore ? parseInt(maxScore) : undefined,
      city: city === 'all' ? undefined : city,
      sortBy: sortBy as AgentFilters['sortBy']
    });
  };
  
  // Handle resetting all filters
  const handleResetFilters = () => {
    // Reset local state
    setSearchValue('');
    setMinScore('');
    setMaxScore('');
    setCity('all');
    setSortBy('score');
    
    // Apply reset to parent component
    onFilterChange({
      search: '',
      minScore: undefined,
      maxScore: undefined,
      city: undefined,
      sortBy: 'score',
      page: 1
    });
  };



  return (
    <aside className="w-full md:w-64 bg-gray-900 border-r border-gray-800 p-4 md:h-[calc(100vh-64px)] md:overflow-y-auto">

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Search</h2>
        <div className="relative mb-4">
          <Input
            id="searchInput"
            placeholder="Username or city..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-gray-800 border border-gray-700 text-white"
          />
          <Button 
            id="searchButton"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            onClick={handleSearch}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Filters</h2>
        
        <div className="mb-4">
          <Label className="block text-sm font-medium mb-1">Score Range</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-1/2 bg-gray-800 border border-gray-700 text-white"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-1/2 bg-gray-800 border border-gray-700 text-white"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <Label className="block text-sm font-medium mb-1">City</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-4">
          <Label className="block text-sm font-medium mb-1">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="score">Score (High to Low)</SelectItem>
              <SelectItem value="score_asc">Score (Low to High)</SelectItem>
              <SelectItem value="followers">Followers (High to Low)</SelectItem>
              <SelectItem value="likes">Likes (High to Low)</SelectItem>
              <SelectItem value="retweets">Retweets (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-secondary hover:bg-indigo-700"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
          
          <Button 
            className="flex-1 bg-red-800 hover:bg-red-700 text-white"
            onClick={handleResetFilters}
            variant="destructive"
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </aside>
  );
}
