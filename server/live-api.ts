import axios from "axios";
import { z } from "zod";
import { leaderboardEntrySchema, agentDetailsSchema } from "@shared/schema";
import type { Agent, LeaderboardEntry, AgentDetails } from "@shared/schema";

// API endpoints
const LEADERBOARD_API = "https://digital-clone-production.onrender.com/digital-clones/leaderboards?full=true";
const AGENT_DETAILS_API = "https://digital-clone-production.onrender.com/digital-clones/clones/";

// Cache control with improved API usage protection
let cachedLeaderboardData: Agent[] | null = null;
let cachedCities: string[] | null = null;
let cachedAgentDetails: Map<string, {data: any, timestamp: number}> = new Map();
let lastFetchTime = 0;
let fetchInProgress = false;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache - longer to avoid unnecessary API calls
const FORCE_REFRESH_TTL = 3 * 60 * 60 * 1000; // Force refresh after 3 hours
const AGENT_DETAILS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for individual agent details
const REQUEST_THROTTLE = 10 * 1000; // Min time between API calls (10 seconds)

/**
 * Get the live leaderboard data directly from the API
 */
export async function getLiveLeaderboardData() {
  const now = Date.now();
  
  // Return cached data if within valid cache time
  if (cachedLeaderboardData && (now - lastFetchTime < CACHE_TTL)) {
    return cachedLeaderboardData;
  }
  
  // If a fetch is already in progress, wait and return cached data to prevent concurrent API calls
  if (fetchInProgress) {
    console.log("Another API fetch is already in progress, using cached data");
    return cachedLeaderboardData || [];
  }
  
  // Check if we're within throttle period (don't make API calls too close together)
  if (cachedLeaderboardData && now - lastFetchTime < REQUEST_THROTTLE) {
    console.log("Within API throttle period, using cached data");
    return cachedLeaderboardData;
  }
  
  // Use expired cache if we have it unless the cache is very old
  if (cachedLeaderboardData && now - lastFetchTime < FORCE_REFRESH_TTL) {
    // Schedule a background refresh for next request but return current cache immediately
    setTimeout(() => {
      if (!fetchInProgress) {
        fetchInProgress = true;
        getLiveLeaderboardData()
          .finally(() => {
            fetchInProgress = false;
          });
      }
    }, 100);
    
    return cachedLeaderboardData;
  }
  
  // Set fetch in progress flag
  fetchInProgress = true;
  
  try {
    // Fetch fresh data from API
    console.log("Fetching live leaderboard data from:", LEADERBOARD_API);
    
    const response = await axios.get(LEADERBOARD_API, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Freysa-Leaderboard/1.0',
        'Cache-Control': 'no-cache'
      },
      timeout: 60000 // 60 second timeout
    });
    
    console.log("Received live leaderboard data response:", 
                response.status, 
                response.statusText,
                "Data sample:", 
                JSON.stringify(response.data).substring(0, 200) + "...");
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Validate and parse leaderboard data
      console.log("Parsing leaderboard entries...");
      const entries = z.array(leaderboardEntrySchema).parse(response.data);
      console.log(`Successfully parsed ${entries.length} leaderboard entries`);
      
      // Process the raw entries into agents
      const agents = entries.map((entry, index) => {
        return {
          id: index + 1, // Generate sequential IDs
          snapshotId: 0, // Not using snapshots anymore
          mastodonUsername: entry.mastodonUsername,
          score: entry.score,
          prevScore: null,
          avatarUrl: entry.avatarURL || null,
          city: entry.city || null,
          likesCount: entry.likesCount || null,
          followersCount: entry.followersCount || null,
          retweetsCount: entry.retweetsCount || null,
          repliesCount: null,
          rank: index + 1, // Assign rank based on position in array
          prevRank: null,
          walletAddress: entry.walletAddress || null,
          walletBalance: entry.walletBalance || null,
          mastodonBio: entry.mastodonBio || null,
          bioUpdatedAt: entry.bioUpdatedAt ? new Date(entry.bioUpdatedAt) : null,
          ubiClaimedAt: entry.ubiClaimedAt ? new Date(entry.ubiClaimedAt) : null
        } as Agent;
      });
      
      // Update cache
      cachedLeaderboardData = agents;
      lastFetchTime = now;
      updateCachedCities(agents);
      
      return agents;
    } else {
      console.error("API returned empty data format");
      
      if (response.data && response.data.agents && Array.isArray(response.data.agents)) {
        console.log("Found agents array in response, using that instead");
        
        // Map agents from the new format
        const agents = response.data.agents.map((entry: any, index: number) => {
          return {
            id: index + 1,
            snapshotId: 0,
            mastodonUsername: entry.mastodonUsername,
            score: entry.score || 0,
            prevScore: null,
            avatarUrl: entry.avatarUrl || null,
            city: entry.city || null,
            likesCount: entry.likesCount || null,
            followersCount: entry.followersCount || null,
            retweetsCount: entry.retweetsCount || null,
            repliesCount: null,
            rank: index + 1,
            prevRank: null,
            walletAddress: entry.walletAddress || null,
            walletBalance: entry.walletBalance || null,
            mastodonBio: entry.mastodonBio || null,
            bioUpdatedAt: entry.bioUpdatedAt ? new Date(entry.bioUpdatedAt) : null,
            ubiClaimedAt: entry.ubiClaimedAt ? new Date(entry.ubiClaimedAt) : null
          } as Agent;
        });
        
        // Update cache
        cachedLeaderboardData = agents;
        lastFetchTime = now;
        updateCachedCities(agents);
        
        return agents;
      }
      
      throw new Error("Invalid data format");
    }
  } catch (apiError: any) {
    console.error("API error during leaderboard fetch:", apiError.message);
    
    // Return cached data if any exists, even if expired
    if (cachedLeaderboardData) {
      console.log("Using expired cached data due to API error");
      return cachedLeaderboardData;
    }
    
    // If no cache exists, throw the error
    throw new Error("Failed to fetch leaderboard data and no cache available");
  } finally {
    // Always reset the in-progress flag
    fetchInProgress = false;
  }
}

/**
 * Get a specific agent by username
 */
export async function getLiveAgentDetail(username: string) {
  try {
    const now = Date.now();
    
    // Check if we have a cached agent detail
    const normalizedUsername = username.toLowerCase();
    const cachedDetail = cachedAgentDetails.get(normalizedUsername);
    
    // Return from cache if still valid
    if (cachedDetail && (now - cachedDetail.timestamp < AGENT_DETAILS_CACHE_TTL)) {
      console.log(`Using cached agent detail for ${username}`);
      return cachedDetail.data;
    }
    
    // Try to get basic agent info from leaderboard cache first
    if (cachedLeaderboardData) {
      const cachedAgent = cachedLeaderboardData.find(
        a => a.mastodonUsername.toLowerCase() === normalizedUsername
      );
      
      if (cachedAgent) {
        // Try to get additional details from the API
        try {
          console.log(`Fetching enriched agent details for ${username}`);
          const detailsResponse = await axios.get(`${AGENT_DETAILS_API}${username}`, {
            headers: { 
              'Accept': 'application/json',
              'User-Agent': 'Freysa-Leaderboard/1.0',
              'Cache-Control': 'no-cache'
            },
            timeout: 10000 // 10 second timeout
          });
          
          if (detailsResponse.data) {
            // Parse and validate the data
            const agentDetails = agentDetailsSchema.parse(detailsResponse.data);
            
            // Extract tweets if available
            const tweets = detailsResponse.data.tweets || [];
            
            // Merge with cached basic data
            const enrichedAgent = {
              ...cachedAgent,
              mastodonBio: agentDetails.mastodonBio || cachedAgent.mastodonBio,
              walletAddress: agentDetails.walletAddress || cachedAgent.walletAddress,
              walletBalance: agentDetails.walletBalance || cachedAgent.walletBalance,
              bioUpdatedAt: agentDetails.bioUpdatedAt ? new Date(agentDetails.bioUpdatedAt) : cachedAgent.bioUpdatedAt,
              ubiClaimedAt: agentDetails.ubiClaimedAt ? new Date(agentDetails.ubiClaimedAt) : cachedAgent.ubiClaimedAt,
              tweets: tweets
            };
            
            // Cache the enriched agent
            cachedAgentDetails.set(normalizedUsername, {
              data: enrichedAgent,
              timestamp: now
            });
            
            return enrichedAgent;
          }
        } catch (detailsError) {
          console.error(`Error fetching details for ${username}:`, detailsError);
          // Return the cached agent without additional details
        }
        
        return cachedAgent;
      }
    }
    
    // If not in cache, try to fetch directly from agent detail API
    console.log(`Fetching full agent details for ${username}`);
    const response = await axios.get(`${AGENT_DETAILS_API}${username}`, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Freysa-Leaderboard/1.0',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.data) {
      const agentDetails = agentDetailsSchema.parse(response.data);
      
      // Extract tweets if available
      const tweets = response.data.tweets || [];
      
      // Create an agent with the details
      const fullAgent = {
        id: 0,
        snapshotId: 0,
        mastodonUsername: username,
        score: agentDetails.score || 0,
        prevScore: null,
        avatarUrl: agentDetails.avatarUrl || null,
        city: agentDetails.city || null,
        likesCount: agentDetails.likesCount || null,
        followersCount: agentDetails.followersCount || null,
        retweetsCount: agentDetails.retweetsCount || null,
        repliesCount: agentDetails.repliesCount || null,
        rank: 0,
        prevRank: null,
        walletAddress: agentDetails.walletAddress || null,
        walletBalance: agentDetails.walletBalance || null,
        mastodonBio: agentDetails.mastodonBio || null,
        bioUpdatedAt: agentDetails.bioUpdatedAt ? new Date(agentDetails.bioUpdatedAt) : null,
        ubiClaimedAt: agentDetails.ubiClaimedAt ? new Date(agentDetails.ubiClaimedAt) : null,
        tweets: tweets
      } as Agent & { tweets: any[] };
      
      // Cache the agent details
      cachedAgentDetails.set(normalizedUsername, {
        data: fullAgent,
        timestamp: Date.now()
      });
      
      return fullAgent;
    }
    
    throw new Error("Agent not found");
  } catch (error) {
    console.error(`Error fetching agent ${username}:`, error);
    throw error;
  }
}

/**
 * Filter agents based on provided criteria
 */
export function filterAgents(agents: Agent[], filters: {
  search?: string;
  minScore?: number;
  maxScore?: number;
  city?: string;
  sortBy?: 'score' | 'score_asc' | 'followers' | 'likes' | 'retweets';
  page?: number;
  limit?: number;
}) {
  let filteredAgents = [...agents];
  
  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredAgents = filteredAgents.filter(agent => 
      agent.mastodonUsername.toLowerCase().includes(searchLower) ||
      (agent.city && agent.city.toLowerCase().includes(searchLower))
    );
  }
  
  // Apply score filters
  if (filters.minScore !== undefined) {
    filteredAgents = filteredAgents.filter(agent => agent.score >= filters.minScore!);
  }
  
  if (filters.maxScore !== undefined) {
    filteredAgents = filteredAgents.filter(agent => agent.score <= filters.maxScore!);
  }
  
  // Apply city filter
  if (filters.city && filters.city !== 'all') {
    filteredAgents = filteredAgents.filter(agent => 
      agent.city && agent.city.toUpperCase() === filters.city!.toUpperCase()
    );
  }
  
  // Apply sorting
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'score':
        filteredAgents.sort((a, b) => b.score - a.score);
        break;
      case 'score_asc':
        filteredAgents.sort((a, b) => a.score - b.score);
        break;
      case 'followers':
        filteredAgents.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
        break;
      case 'likes':
        filteredAgents.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
        break;
      case 'retweets':
        filteredAgents.sort((a, b) => (b.retweetsCount || 0) - (a.retweetsCount || 0));
        break;
    }
  }
  
  // Calculate pagination
  const totalCount = filteredAgents.length;
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  // Apply pagination
  const pagedAgents = filteredAgents.slice(startIndex, endIndex);
  
  return {
    agents: pagedAgents,
    totalCount
  };
}

/**
 * Get statistics for the current data
 */
export async function getLiveStats() {
  try {
    const agents = await getLiveLeaderboardData();
    
    if (!agents || agents.length === 0) {
      return {
        totalAgents: 0,
        avgScore: 0,
        totalLikes: 0,
        topGainers: [],
        topLosers: []
      };
    }
    
    // Calculate statistics
    const totalAgents = agents.length;
    const avgScore = Math.round(agents.reduce((sum, agent) => sum + agent.score, 0) / totalAgents);
    const totalLikes = agents.reduce((sum, agent) => sum + (agent.likesCount || 0), 0);
    
    // Sort by score for top agents (we don't have gain/loss data in live mode)
    const sortedByScore = [...agents].sort((a, b) => b.score - a.score);
    const topGainers = sortedByScore.slice(0, 5);
    
    // Reverse for losers
    const sortedByScoreAsc = [...agents].sort((a, b) => a.score - b.score);
    const topLosers = sortedByScoreAsc.slice(0, 5);
    
    return {
      totalAgents,
      avgScore,
      totalLikes,
      topGainers,
      topLosers
    };
  } catch (error) {
    console.error("Error getting live stats:", error);
    throw error;
  }
}

/**
 * Get available cities from the data
 */
export function getAvailableCities() {
  if (cachedCities) {
    return cachedCities;
  }
  
  return [];
}

/**
 * Update the cities cache from new agent data
 */
function updateCachedCities(agents: Agent[]) {
  // Only update if we don't already have city data or if it's been over 24 hours
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  if (!cachedCities || cachedCities.length === 0 || now - lastFetchTime > ONE_DAY) {
    const citySet = new Set<string>();
    
    agents.forEach(agent => {
      if (agent.city) {
        citySet.add(agent.city);
      }
    });
    
    cachedCities = Array.from(citySet);
    console.log(`Updated cities cache with ${cachedCities.length} cities`);
  }
}

// No longer needed - we're using real data only