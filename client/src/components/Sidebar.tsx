import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Snapshot, AgentFilters } from '@/types/agent';
import { formatDate } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProps {
  snapshots: Snapshot[];
  selectedSnapshot: number | null;
  onSnapshotChange: (id: number) => void;
  filters: AgentFilters;
  onFilterChange: (filters: Partial<AgentFilters>) => void;
  cities: string[];
  isLoading: boolean;
}

export default function Sidebar({ 
  snapshots, 
  selectedSnapshot, 
  onSnapshotChange, 
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

  return (
    <aside className="w-full md:w-64 bg-gray-900 border-r border-gray-800 p-4 md:h-[calc(100vh-64px)] md:overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Snapshots</h2>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full bg-gray-800" />
              <Skeleton className="h-10 w-full bg-gray-800" />
              <Skeleton className="h-10 w-full bg-gray-800" />
            </>
          ) : snapshots.length > 0 ? (
            snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                className={`w-full flex justify-between items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedSnapshot === snapshot.id
                    ? 'bg-primary hover:bg-purple-800'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={() => onSnapshotChange(snapshot.id)}
              >
                <div className="flex flex-col">
                  <span>{snapshot.description || formatDate(snapshot.timestamp)}</span>
                  {snapshot.id === 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Delete the initial snapshot with ID 1
                        fetch(`/api/snapshots/${snapshot.id}`, {
                          method: 'DELETE',
                        })
                          .then(response => response.json())
                          .then(() => {
                            // Refresh the page after deletion
                            window.location.reload();
                          })
                          .catch(error => console.error('Error deleting snapshot:', error));
                      }}
                      className="text-xs text-red-500 hover:text-red-300 mt-1"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {snapshot.id === snapshots[0].id && (
                  <span className="text-xs px-2 py-0.5 bg-primary rounded-full">Latest</span>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-2 text-gray-400">
              No snapshots available
            </div>
          )}
        </div>
      </div>

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
        
        <Button 
          className="w-full bg-secondary hover:bg-indigo-700"
          onClick={handleApplyFilters}
        >
          Apply Filters
        </Button>
      </div>
    </aside>
  );
}
