import axios, { AxiosInstance } from "axios";
import { z } from "zod";
import { leaderboardEntrySchema, agentDetailsSchema } from "@shared/schema";
import type { Agent, LeaderboardEntry, AgentDetails } from "@shared/schema";

// --- Configuration ---
const LEADERBOARD_API_URL = "https://determined-smile-production-e0d1.up.railway.app/digital-clones/leaderboards?full=true";
const AGENT_DETAILS_API_BASE_URL = "https://determined-smile-production-e0d1.up.railway.app/digital-clones/clones/";

// ** Data Validation Control **
// SET TO `false` (Recommended): Enforces schema validation via Zod. Prevents bad data but
// requires downstream code to handle potential `null` or filtered results if API data is invalid.
// SET TO `true` (Use with Caution): Bypasses Zod validation. Faster if schemas are complex,
// but RISKY if API data format changes unexpectedly. Only use if validation causes issues
// and you understand the risks.
const DISABLE_VALIDATION = false; // Defaulting to ENABLED validation

const LEADERBOARD_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const AGENT_DETAILS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const REQUEST_THROTTLE_MS = 3 * 1000; // Min time between API calls (3 seconds)
const MAX_AGENT_DETAIL_CACHE_SIZE = 100; // Max number of individual agent details to cache
const API_TIMEOUT = 30000; // 30 seconds timeout for API calls
const CONSECUTIVE_FAILURE_THRESHOLD = 3; // Warn loudly after 3 consecutive API failures

// --- Interfaces ---

// Interface for leaderboard data stored in cache. Uses LeaderboardEntry schema fields.
// Added rank for convenience during processing.
// Note: This might differ slightly from full Agent or AgentDetails.
type CachedLeaderboardEntry = LeaderboardEntry & { rank: number };

// Type for agent details cache entries
interface AgentDetailCacheEntry {
    // Cache can hold either full details or just leaderboard entry data
    data: AgentDetails | CachedLeaderboardEntry;
    timestamp: number;
}

// --- State ---
let cachedLeaderboardData: CachedLeaderboardEntry[] | null = null;
let leaderboardLastFetchTime = 0;
let isLeaderboardFetchInProgress = false;
let consecutiveApiFailures = 0; // Track consecutive API errors

let cachedAgentDetails: Map<string, AgentDetailCacheEntry> = new Map();
let citiesCache: Set<string> | null = null;

// --- API Client ---
const apiClient: AxiosInstance = axios.create({
    timeout: API_TIMEOUT,
    headers: {
        'Accept': 'application/json',
        'User-Agent': 'Freysa-Leaderboard/1.2', // Updated version
        'Cache-Control': 'no-cache',
    },
});

// --- Helper Functions ---

/**
 * Parses and validates raw API data for the leaderboard.
 * Filters out entries that fail schema validation.
 */
function parseAndValidateLeaderboardResponse(responseData: any): CachedLeaderboardEntry[] {
    let rawAgents: any[] = [];

    if (Array.isArray(responseData)) {
        rawAgents = responseData;
    } else if (responseData?.agents && Array.isArray(responseData.agents)) {
        rawAgents = responseData.agents;
    } else {
        console.warn("Received unexpected leaderboard data format. Cannot parse.");
        return [];
    }

    if (rawAgents.length === 0) {
        console.log("Leaderboard API returned empty agent list.");
        return [];
    }

    const validatedAgents: CachedLeaderboardEntry[] = [];
    rawAgents.forEach((entry: any, index: number) => {
        // Add rank before validation if needed by schema/downstream cache use
        entry.rank = index + 1;

        if (DISABLE_VALIDATION) {
            // ** Bypassing Validation (Risky) **
            // Basic type coercion for critical fields if validation is off
             const score = typeof entry.score === 'number' ? entry.score : parseInt(entry.score, 10);
             const minimalEntry = {
                mastodonUsername: entry.mastodonUsername ?? 'unknown',
                score: isNaN(score) ? 0 : score,
                avatarURL: entry.avatarURL ?? entry.avatarUrl ?? null, // Use schema field name
                city: entry.city ?? null,
                likesCount: entry.likesCount ?? 0,
                followersCount: entry.followersCount ?? 0,
                retweetsCount: entry.retweetsCount ?? 0,
                rank: entry.rank, // Keep rank
            };
            // Only add if username is present
            if (minimalEntry.mastodonUsername !== 'unknown') {
                 validatedAgents.push(minimalEntry as CachedLeaderboardEntry); // Assert type if validation off
            }

        } else {
             // ** Using Zod Validation **
            const result = leaderboardEntrySchema.safeParse(entry);
            if (result.success) {
                // Add rank to the validated data before caching
                validatedAgents.push({ ...result.data, rank: entry.rank });
            } else {
                console.warn(`Leaderboard entry validation failed for item at index ${index}:`, result.error.flatten().fieldErrors);
                // Optionally log `entry` itself for debugging, be mindful of sensitive data
                // console.debug("Failed entry data:", entry);
                // Skip invalid entries
            }
        }
    });

    console.log(`Parsed ${rawAgents.length} raw entries, successfully validated ${validatedAgents.length} leaderboard entries.`);
    return validatedAgents;
}

/** Safely converts a value to Date or returns null */
function safeParseDate(value: any): Date | null {
    if (!value) return null;
    try {
        // Handle potential number timestamps (milliseconds)
        const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        return null;
    }
}


/**
 * Parses and validates raw API data for a single agent.
 * Returns validated AgentDetails or null if validation fails.
 */
function parseAndValidateAgentDetailResponse(responseData: any, username: string): AgentDetails | null {
    const rawData = responseData ?? {};

     if (DISABLE_VALIDATION) {
        // ** Bypassing Validation (Risky) **
        // Manually construct the object with basic type safety
        const score = typeof rawData.score === 'number' ? rawData.score : parseInt(rawData.score, 10);
        const agentDetails: AgentDetails = {
            mastodonUsername: rawData.mastodonUsername ?? username,
            score: isNaN(score) ? 0 : score,
            mastodonBio: rawData.mastodonBio ?? null,
            walletAddress: rawData.walletAddress ?? null,
            walletBalance: rawData.walletBalance ?? null,
            likesCount: rawData.likesCount ?? 0,
            followersCount: rawData.followersCount ?? 0,
            retweetsCount: rawData.retweetsCount ?? 0,
            repliesCount: rawData.repliesCount ?? 0,
            city: rawData.city ?? null,
            bioUpdatedAt: safeParseDate(rawData.bioUpdatedAt),
            ubiClaimedAt: safeParseDate(rawData.ubiClaimedAt),
            tweets: rawData.tweets ?? [],
            avatarUrl: rawData.avatarUrl ?? rawData.avatarURL ?? null, // Add avatarUrl
        };
        return agentDetails;
     } else {
        // ** Using Zod Validation **
        const result = agentDetailsSchema.safeParse(rawData);
        if (result.success) {
            // Ensure date fields are Date objects (Zod might allow strings if not preprocessed)
            result.data.bioUpdatedAt = safeParseDate(result.data.bioUpdatedAt);
            result.data.ubiClaimedAt = safeParseDate(result.data.ubiClaimedAt);
            return result.data; // Return validated data
        } else {
            console.warn(`Agent details validation failed for ${username}:`, result.error.flatten().fieldErrors);
            // console.debug("Failed agent data:", rawData);
            return null; // Indicate validation failure
        }
     }
}


/** Updates the city cache Set */
function updateCitiesCache(agents: CachedLeaderboardEntry[]): void {
    const newCities = new Set<string>();
    for (const agent of agents) {
        if (agent.city) {
            newCities.add(agent.city);
        }
    }
    citiesCache = newCities;
    // console.log(`Updated cities cache with ${citiesCache.size} unique cities`);
}

/** Prunes the agent details cache if it exceeds the maximum size */
function pruneAgentDetailCache(): void {
    if (cachedAgentDetails.size > MAX_AGENT_DETAIL_CACHE_SIZE) {
        const entries = Array.from(cachedAgentDetails.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first
        const removeCount = Math.max(1, cachedAgentDetails.size - MAX_AGENT_DETAIL_CACHE_SIZE); // Ensure target size
        for (let i = 0; i < removeCount; i++) {
            cachedAgentDetails.delete(entries[i][0]);
        }
        console.log(`Pruned ${removeCount} old agent detail cache entries. New size: ${cachedAgentDetails.size}`);
    }
}


// --- Public API Functions ---

/**
 * Get the live leaderboard data. Uses caching, throttling, and validation.
 * Returns array of validated LeaderboardEntry objects (with rank added).
 */
export async function getLiveLeaderboardData(): Promise<CachedLeaderboardEntry[]> {
    const now = Date.now();

    // 1. Check Throttle
    if (now - leaderboardLastFetchTime < REQUEST_THROTTLE_MS && cachedLeaderboardData) {
        return cachedLeaderboardData;
    }

    // 2. Check Cache Validity
    if (cachedLeaderboardData && (now - leaderboardLastFetchTime < LEADERBOARD_CACHE_TTL)) {
        return cachedLeaderboardData;
    }

    // 3. Handle Concurrent Fetch
    if (isLeaderboardFetchInProgress) {
        console.log("Leaderboard fetch in progress, returning existing cache data (may be stale).");
        return cachedLeaderboardData ?? [];
    }

    // 4. Initiate Fetch
    isLeaderboardFetchInProgress = true;
    console.log("Fetching fresh leaderboard data from API...");

    try {
        const response = await apiClient.get<unknown>(LEADERBOARD_API_URL); // Use generic type
        const agentData = parseAndValidateLeaderboardResponse(response.data);

        // Reset failure count on successful fetch *and* successful parsing
        consecutiveApiFailures = 0;

        if (agentData.length > 0) {
            cachedLeaderboardData = agentData;
            leaderboardLastFetchTime = Date.now();
            updateCitiesCache(agentData);
            // console.log(`Successfully fetched and validated ${agentData.length} leaderboard agents.`);
            return agentData;
        } else {
            console.warn("Leaderboard fetch successful but resulted in zero valid agents after parsing/validation.");
            // Don't update cache time. Return potentially stale cache or empty.
            return cachedLeaderboardData ?? [];
        }

    } catch (error: any) {
        consecutiveApiFailures++;
        console.error(`API error fetching leaderboard (Failure ${consecutiveApiFailures}):`, error.message);
        if (consecutiveApiFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
             console.error(`*** Potential persistent API issue: Leaderboard fetch failed ${consecutiveApiFailures} consecutive times. ***`);
        }

        if (cachedLeaderboardData) {
            console.warn("Returning stale leaderboard data due to API error.");
            return cachedLeaderboardData;
        } else {
            return []; // No cache available, return empty
        }
    } finally {
        isLeaderboardFetchInProgress = false;
    }
}

/**
 * Get details for a specific agent by username. Uses caching and validation.
 * Returns validated AgentDetails or falls back to cached LeaderboardEntry data if fetch fails,
 * or null if not found / invalid.
 */
export async function getLiveAgentDetail(username: string): Promise<AgentDetails | CachedLeaderboardEntry | null> {
    const now = Date.now();
    const normalizedUsername = username.toLowerCase();

    // 1. Check Agent Detail Cache
    const cachedDetailEntry = cachedAgentDetails.get(normalizedUsername);
    if (cachedDetailEntry && (now - cachedDetailEntry.timestamp < AGENT_DETAILS_CACHE_TTL)) {
        return cachedDetailEntry.data;
    }

    // 2. Attempt to Fetch Fresh Data from API
    console.log(`Fetching agent details for ${username} from API...`);
    try {
        const response = await apiClient.get<unknown>(`${AGENT_DETAILS_API_BASE_URL}${username}`);
        const agentDetails = parseAndValidateAgentDetailResponse(response.data, username);

        if (agentDetails) {
             // Successfully fetched and validated details
            cachedAgentDetails.set(normalizedUsername, {
                data: agentDetails,
                timestamp: Date.now(),
            });
            pruneAgentDetailCache();
            return agentDetails;
        } else {
            // API returned data, but it failed validation
             console.warn(`Fetched data for ${username} failed validation. Agent details not updated/cached.`);
             // Return stale cache if available, otherwise null
             return cachedDetailEntry ? cachedDetailEntry.data : null;
        }

    } catch (error: any) {
         if (axios.isAxiosError(error) && error.response?.status === 404) {
            console.log(`Agent ${username} not found via API (404).`);
            cachedAgentDetails.delete(normalizedUsername); // Remove if not found
            return null;
        } else {
            // Other API errors
            console.error(`Error fetching details for ${username}:`, error.message);
            // Fallback: Return stale cache data if available
            if (cachedDetailEntry) {
                console.warn(`Returning stale cached detail for ${username} due to API error.`);
                return cachedDetailEntry.data;
            }
            // If no cache and fetch failed, signal problem (could return null or throw)
            // Returning null might be safer for consumers than throwing
            return null;
             // Or: throw new Error(`Failed to fetch details for ${username}: ${error.message}`);
        }
    }
}


/**
 * Get available unique city names from the cached leaderboard data.
 */
export function getAvailableCities(): string[] {
    if (citiesCache) {
        return Array.from(citiesCache);
    }
    if (cachedLeaderboardData) {
        console.log("Cities cache miss, rebuilding from available leaderboard data.");
        updateCitiesCache(cachedLeaderboardData);
        return Array.from(citiesCache ?? []);
    }

    console.log("No city data available, requesting background leaderboard fetch.");
    getLiveLeaderboardData().catch(err => console.error("Background leaderboard fetch for cities failed:", err));
    return [];
}


// --- Filtering and Stats Functions (Largely Unchanged Internally) ---
// Depend on the data structures returned by the fetching functions above.
// Input type adjusted to reflect cached leaderboard data structure.

/**
 * Filter agents based on provided criteria. Operates on cached leaderboard data.
 */
export function filterAgents(agents: CachedLeaderboardEntry[], filters: {
    search?: string;
    minScore?: number;
    maxScore?: number;
    city?: string;
    sortBy?: 'score' | 'score_asc' | 'followers' | 'likes' | 'retweets'; // Removed score_change as prevScore not guaranteed
    page?: number;
    limit?: number;
}) {
    let filteredAgents = [...agents]; // Work on a copy

    // Apply search filter (Username or City)
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredAgents = filteredAgents.filter(agent =>
            agent.mastodonUsername.toLowerCase().includes(searchLower) ||
            (agent.city && agent.city.toLowerCase().includes(searchLower))
        );
    }

    // Apply score filters
    if (typeof filters.minScore === 'number') {
        filteredAgents = filteredAgents.filter(agent => (agent.score ?? 0) >= filters.minScore!);
    }
    if (typeof filters.maxScore === 'number') {
        filteredAgents = filteredAgents.filter(agent => (agent.score ?? 0) <= filters.maxScore!);
    }

    // Apply city filter
    if (filters.city && filters.city !== 'all') {
        const cityUpper = filters.city.toUpperCase();
        filteredAgents = filteredAgents.filter(agent =>
            agent.city && agent.city.toUpperCase() === cityUpper
        );
    }

    // Apply sorting
    if (filters.sortBy) {
        // Add nullish coalescing (?? 0) for safety during sorts
        filteredAgents.sort((a, b) => {
            switch (filters.sortBy) {
                case 'score':
                    return (b.score ?? 0) - (a.score ?? 0);
                case 'score_asc':
                    return (a.score ?? 0) - (b.score ?? 0);
                 // NOTE: 'score_change' requires historical data not present in live cache
                 // case 'score_change': ...
                case 'followers':
                    return (b.followersCount ?? 0) - (a.followersCount ?? 0);
                case 'likes':
                    return (b.likesCount ?? 0) - (a.likesCount ?? 0);
                case 'retweets':
                    return (b.retweetsCount ?? 0) - (a.retweetsCount ?? 0);
                default:
                    return 0;
            }
        });
    }

    // Apply pagination
    const totalCount = filteredAgents.length;
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, filters.limit ?? 50);
    const startIndex = (page - 1) * limit;
    const pagedAgents = filteredAgents.slice(startIndex, startIndex + limit);

    return {
        agents: pagedAgents,
        totalCount,
    };
}

/**
 * Get basic statistics for the current live leaderboard data.
 */
export async function getLiveStats() {
    const agents = await getLiveLeaderboardData(); // Uses caching

    if (!agents || agents.length === 0) {
        return {
            totalAgents: 0,
            avgScore: 0,
            topScorers: [], // Renamed for clarity
            bottomScorers: [], // Renamed for clarity
        };
    }

    const totalAgents = agents.length;
    const totalScore = agents.reduce((sum, agent) => sum + (agent.score ?? 0), 0);
    const avgScore = totalAgents > 0 ? Math.round(totalScore / totalAgents) : 0;

    // Sort by score (descending) - use ?? 0 for safety
    const sortedByScoreDesc = [...agents].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topScorers = sortedByScoreDesc.slice(0, 5);

    // Get bottom scorers by reversing or sorting ascending
    const sortedByScoreAsc = sortedByScoreDesc.reverse(); // Efficient way to get ascending sort
    const bottomScorers = sortedByScoreAsc.slice(0, 5);

    return {
        totalAgents,
        avgScore,
        topScorers, // Use clearer names based on score
        bottomScorers,
    };
}