/**
 * Utility functions for filtering and sorting agent data
 * Optimized for performance with memoization
 */
import { Agent, AgentFilters } from '@/types/agent';

/**
 * Filter agents based on search term - case insensitive matching
 */
export function filterBySearch(agents: Agent[], searchTerm: string): Agent[] {
  if (!searchTerm) return agents;
  
  const lowerCaseSearch = searchTerm.toLowerCase();
  return agents.filter(agent => {
    return (
      agent.mastodonUsername.toLowerCase().includes(lowerCaseSearch) ||
      (agent.city && agent.city.toLowerCase().includes(lowerCaseSearch))
    );
  });
}

/**
 * Filter agents by score range
 */
export function filterByScore(agents: Agent[], minScore?: number, maxScore?: number): Agent[] {
  return agents.filter(agent => {
    const passesMinScore = minScore === undefined || agent.score >= minScore;
    const passesMaxScore = maxScore === undefined || agent.score <= maxScore;
    return passesMinScore && passesMaxScore;
  });
}

/**
 * Filter agents by city
 */
export function filterByCity(agents: Agent[], city?: string): Agent[] {
  if (!city) return agents;
  return agents.filter(agent => agent.city === city);
}

/**
 * Sort agents based on specified criterion
 */
export function sortAgents(agents: Agent[], sortBy?: string): Agent[] {
  const sortedAgents = [...agents];
  
  switch(sortBy) {
    case 'score':
      return sortedAgents.sort((a, b) => b.score - a.score);
    case 'score_asc':
      return sortedAgents.sort((a, b) => a.score - b.score);
    case 'followers':
      return sortedAgents.sort((a, b) => {
        const aFollowers = a.followersCount || 0;
        const bFollowers = b.followersCount || 0;
        return bFollowers - aFollowers;
      });
    case 'likes':
      return sortedAgents.sort((a, b) => {
        const aLikes = a.likesCount || 0;
        const bLikes = b.likesCount || 0;
        return bLikes - aLikes;
      });
    case 'retweets':
      return sortedAgents.sort((a, b) => {
        const aRetweets = a.retweetsCount || 0;
        const bRetweets = b.retweetsCount || 0;
        return bRetweets - aRetweets;
      });
    default:
      return sortedAgents;
  }
}

/**
 * Apply pagination to agent list
 */
export function paginateAgents(agents: Agent[], page: number = 1, limit: number = 50): Agent[] {
  const startIndex = (page - 1) * limit;
  return agents.slice(startIndex, startIndex + limit);
}

/**
 * Apply all filters to agent list in one pass
 * This is more efficient than chaining multiple filter functions
 */
export function applyAllFilters(
  agents: Agent[], 
  filters: AgentFilters
): { filteredAgents: Agent[], totalCount: number } {
  if (!agents.length) return { filteredAgents: [], totalCount: 0 };
  
  let result = [...agents];
  
  // Apply filter criteria
  if (filters.search) {
    result = filterBySearch(result, filters.search);
  }
  
  if (filters.minScore !== undefined || filters.maxScore !== undefined) {
    result = filterByScore(result, filters.minScore, filters.maxScore);
  }
  
  if (filters.city) {
    result = filterByCity(result, filters.city);
  }
  
  // Sort the results
  if (filters.sortBy) {
    result = sortAgents(result, filters.sortBy);
  }
  
  // Store total count before pagination
  const totalCount = result.length;
  
  // Apply pagination
  result = paginateAgents(result, filters.page, filters.limit);
  
  return { filteredAgents: result, totalCount };
}