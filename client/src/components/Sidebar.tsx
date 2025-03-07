import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, FilterX, Filter, ChevronDown, ChevronUp, SlidersHorizontal, User, Users } from 'lucide-react';
import { AgentFilters } from '@/types/agent';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface SidebarProps {
  filters: AgentFilters;
  onFilterChange: (filters: Partial<AgentFilters>) => void;
  cities: string[];
  isLoading: boolean;
  showMyAgents?: boolean;
  onToggleMyAgents?: () => void;
  myAgents?: string[];
}

export default function Sidebar({ 
  filters, 
  onFilterChange, 
  cities,
  isLoading,
  showMyAgents = false,
  onToggleMyAgents = () => {},
  myAgents = []
}: SidebarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [minScore, setMinScore] = useState<string>(filters.minScore?.toString() || '');
  const [maxScore, setMaxScore] = useState<string>(filters.maxScore?.toString() || '');
  const [city, setCity] = useState<string>(filters.city || 'all');
  const [sortBy, setSortBy] = useState<string>(filters.sortBy || 'score');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [desktopFiltersExpanded, setDesktopFiltersExpanded] = useState(true);
  
  const isMobile = useIsMobile();

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
    
    if (isMobile) {
      setFiltersVisible(false);
    }
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
    
    if (isMobile) {
      setFiltersVisible(false);
    }
  };

  // Toggle filters visibility on mobile
  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };
  
  // Toggle filters expansion on desktop
  const toggleDesktopFilters = () => {
    setDesktopFiltersExpanded(!desktopFiltersExpanded);
  };

  return (
    <aside className={`w-full md:w-64 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 p-4 md:h-[calc(100vh-64px)] md:sticky md:top-16 md:overflow-y-auto`}>
      {/* Mobile search and filter toggle */}
      <div className="flex flex-col md:hidden mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-grow">
            <Input
              id="mobileSearchInput"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-gray-800 border border-gray-700 text-white pr-10"
            />
            <Button 
              id="mobileSearchButton"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 border-gray-700 text-white h-10 w-10 min-w-10"
            onClick={toggleFilters}
          >
            {filtersVisible ? <ChevronUp className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Active filter summary */}
        {!filtersVisible && (
          <div className="flex items-center text-xs text-gray-400 flex-wrap gap-1">
            {filters.city && <span className="bg-gray-800 px-2 py-1 rounded-full">City: {filters.city}</span>}
            {filters.minScore && <span className="bg-gray-800 px-2 py-1 rounded-full">Min Score: {filters.minScore}</span>}
            {filters.maxScore && <span className="bg-gray-800 px-2 py-1 rounded-full">Max Score: {filters.maxScore}</span>}
            {filters.sortBy && <span className="bg-gray-800 px-2 py-1 rounded-full">Sort: {filters.sortBy.replace('_', ' ')}</span>}
          </div>
        )}
      </div>
      
      {/* Desktop search and filters */}
      <div className="hidden md:block">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-gradient-animated">Search</h2>
          <div className="relative mb-2">
            <Input
              id="searchInput"
              placeholder="Username or city..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-gray-800 border border-gray-700 text-white focus:border-blue-500/50 transition-colors duration-200"
            />
            <Button 
              id="searchButton"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors duration-200 btn-hover"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Desktop filter header with toggle */}
        <div className="mb-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gradient-animated">Filters</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-400 hover:text-blue-300 transition-colors duration-200 btn-hover"
              onClick={toggleDesktopFilters}
            >
              {desktopFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Show active filter count when collapsed */}
          {!desktopFiltersExpanded && (
            <div className="flex items-center gap-1 text-xs">
              {(filters.minScore || filters.maxScore || filters.city || filters.sortBy !== 'score') && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none shadow-sm animate-pulse-soft">
                  {[
                    filters.city ? 1 : 0,
                    filters.minScore ? 1 : 0,
                    filters.maxScore ? 1 : 0,
                    filters.sortBy !== 'score' ? 1 : 0
                  ].reduce((a, b) => a + b, 0)} active
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Active filter pills when collapsed */}
        {!desktopFiltersExpanded && (
          <div className="mb-3 flex flex-wrap gap-1 text-xs">
            {filters.city && (
              <Badge variant="outline" className="bg-gray-800/80 text-blue-300 border-blue-500/30 hover:bg-gray-700 transition-colors duration-200">
                City: {filters.city}
              </Badge>
            )}
            {filters.minScore && (
              <Badge variant="outline" className="bg-gray-800/80 text-blue-300 border-blue-500/30 hover:bg-gray-700 transition-colors duration-200">
                Min: {filters.minScore}
              </Badge>
            )}
            {filters.maxScore && (
              <Badge variant="outline" className="bg-gray-800/80 text-blue-300 border-blue-500/30 hover:bg-gray-700 transition-colors duration-200">
                Max: {filters.maxScore}
              </Badge>
            )}
            {filters.sortBy && filters.sortBy !== 'score' && (
              <Badge variant="outline" className="bg-gray-800/80 text-blue-300 border-blue-500/30 hover:bg-gray-700 transition-colors duration-200">
                Sort: {filters.sortBy.replace('_', ' ')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Filter controls - conditionally visible based on device and toggle state */}
      <div className={`${(isMobile && !filtersVisible) || (!isMobile && !desktopFiltersExpanded) ? 'hidden' : 'block'} mb-4`}>
        {/* Only show this heading on mobile */}
        {isMobile && (
          <h2 className="text-lg font-semibold mb-2 text-gradient-animated flex items-center">
            <SlidersHorizontal className="h-4 w-4 mr-1.5 text-blue-400" />
            Filters
          </h2>
        )}
        
        <div className="mb-3">
          <Label className="block text-sm font-medium mb-1 text-blue-300">Score Range</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-1/2 bg-gray-800 border border-gray-700 text-white text-sm focus:border-blue-500/50 transition-colors duration-200"
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-1/2 bg-gray-800 border border-gray-700 text-white text-sm focus:border-blue-500/50 transition-colors duration-200"
            />
          </div>
        </div>
        
        <div className="mb-3">
          <Label className="block text-sm font-medium mb-1 text-blue-300">City</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white text-sm focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all" className="focus:bg-blue-900/20 focus:text-blue-400">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city} className="focus:bg-blue-900/20 focus:text-blue-400">
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="mb-3">
          <Label className="block text-sm font-medium mb-1 text-blue-300">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white text-sm focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="score" className="focus:bg-blue-900/20 focus:text-blue-400">Score (High to Low)</SelectItem>
              <SelectItem value="score_asc" className="focus:bg-blue-900/20 focus:text-blue-400">Score (Low to High)</SelectItem>
              <SelectItem value="score_change" className="focus:bg-blue-900/20 focus:text-blue-400">Score Change (Improved)</SelectItem>
              <SelectItem value="followers" className="focus:bg-blue-900/20 focus:text-blue-400">Followers (High to Low)</SelectItem>
              <SelectItem value="likes" className="focus:bg-blue-900/20 focus:text-blue-400">Likes (High to Low)</SelectItem>
              <SelectItem value="retweets" className="focus:bg-blue-900/20 focus:text-blue-400">Retweets (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
                {/* My Agents Toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {showMyAgents ? (
                <User className="h-4 w-4 text-emerald-400" />
              ) : (
                <Users className="h-4 w-4 text-gray-400" />
              )}
              <Label className="text-sm font-medium text-blue-300">Show My Agents Only</Label>
            </div>
            <Switch
              checked={showMyAgents}
              onCheckedChange={onToggleMyAgents}
              className={showMyAgents ? "bg-emerald-600" : ""}
            />
          </div>
          {myAgents.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              {myAgents.length} saved agent{myAgents.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 text-sm py-1 h-8 shadow-md"
            onClick={handleApplyFilters}
          >
            Apply
          </Button>
          
          <Button 
            className="flex-1 bg-gray-800 hover:bg-red-800/70 text-white text-sm py-1 h-8 transition-colors duration-300 border border-red-600/30"
            onClick={handleResetFilters}
          >
            <FilterX className="h-3.5 w-3.5 mr-1 text-red-400" />
            Reset
          </Button>
        </div>
      </div>
    </aside>
  );
}
