import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface GameStatus {
  prizePool: number;        // Total prize pool in USD
  prizePoolEth: number;     // Total prize pool in ETH
  ethUsdPrice: number;      // Current price of ETH
  endsAt: string;           // Game ending date and time
  entryPriceInEth: number;  // Price to create a digital twin
}

// Cache the game status for 5 minutes to ensure good performance
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Custom hook to fetch game status data
 * Uses React Query for automatic caching and refetching
 */
export function useGameStatus() {
  return useQuery<GameStatus>({
    queryKey: ["gameStatus"],
    queryFn: async () => {
      const response = await axios.get<GameStatus>("https://digital-clone-production.onrender.com/digital-clones/status");
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: CACHE_TIME, // Consider data fresh for 5 minutes
    gcTime: CACHE_TIME,    // Keep unused data in cache for 5 minutes
    retry: 3,              // Retry failed requests up to 3 times
  });
}