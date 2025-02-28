import { useState, useEffect, useRef, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { useToast } from '@/hooks/use-toast';

interface ApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  config?: AxiosRequestConfig;
  dependencies?: any[];
  initialData?: T;
  maxRetries?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheDuration?: number; // milliseconds
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Shared cache across hook instances - use LRU cache to prevent memory leaks
const MAX_CACHE_SIZE = 100;
const apiCache = new Map<string, CacheItem<any>>();

// Helper function to clean up cache when it gets too large
function pruneCache() {
  if (apiCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries first
    const entriesToRemove = apiCache.size - MAX_CACHE_SIZE;
    const entries = Array.from(apiCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < entriesToRemove; i++) {
      apiCache.delete(entries[i][0]);
    }
  }
}

export function useApiWithRetry<T>({
  url,
  method = 'GET',
  config = {},
  dependencies = [],
  initialData,
  maxRetries = 3,
  retryDelay = 1000,
  cacheKey,
  cacheDuration = 5 * 60 * 1000, // 5 minutes default
  onSuccess,
  onError,
  enabled = true
}: ApiOptions<T>) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  // Use refs to prevent unnecessary re-renders and preserve values between renders
  const isMounted = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef(config);
  
  // Update ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  
  // Track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Memoized fetch implementation to avoid recreation on each render
  const fetchWithRetries = useCallback(async (skipCache = false) => {
    // Don't proceed if component is unmounted
    if (!isMounted.current) return;
    
    // Create a new abort controller for this request
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    
    // Check cache first if a cache key is provided and not skipping cache
    if (cacheKey && !skipCache && apiCache.has(cacheKey)) {
      const cachedItem = apiCache.get(cacheKey)!;
      const now = Date.now();
      
      if (now - cachedItem.timestamp < cacheDuration) {
        // Use cached data
        if (isMounted.current) {
          setData(cachedItem.data);
          setLoading(false);
        }
        return;
      } else {
        // Cache expired
        apiCache.delete(cacheKey);
      }
    }
    
    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const response = await axios({
        url,
        method,
        ...configRef.current,
        signal: controllerRef.current.signal
      });
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setData(response.data);
        setError(null);
        setLoading(false);
      }
      
      // Reset retry count on success
      retriesRef.current = 0;
      
      // Cache the response if cacheKey is provided
      if (cacheKey) {
        apiCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        pruneCache(); // Clean up cache if it's too large
      }
      
      // Call success callback
      onSuccess?.(response.data);
    } catch (err) {
      // Skip error handling if request was cancelled or component unmounted
      if (!isMounted.current || axios.isCancel(err)) {
        return;
      }
      
      const error = err as Error;
      
      // Handle retries
      if (retriesRef.current < maxRetries) {
        retriesRef.current++;
        
        // Exponential backoff with jitter to prevent thundering herd
        const baseDelay = retryDelay * Math.pow(2, retriesRef.current - 1);
        const jitter = Math.random() * 0.3 * baseDelay; // Add 0-30% jitter
        const delay = baseDelay + jitter;
        
        // Schedule retry
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => fetchWithRetries(skipCache), delay);
        return;
      }
      
      // Update error state if all retries failed
      if (isMounted.current) {
        setError(error);
        setLoading(false);
      }
      
      // Call error callback
      onError?.(error);
      
      // Show toast notification with appropriate error message
      let errorMessage = error.message;
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        const responseData = axiosError.response?.data as any;
        errorMessage = responseData?.message || error.message;
      }
      
      toast({
        title: "Request failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [url, method, cacheKey, cacheDuration, maxRetries, retryDelay, toast, onSuccess, onError]);
  
  // Expose refetch method that bypasses cache
  const refetch = useCallback(() => {
    retriesRef.current = 0;
    return fetchWithRetries(true);
  }, [fetchWithRetries]);
  
  // Main effect to trigger data fetching
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    // Reset retries on dependency changes
    retriesRef.current = 0;
    fetchWithRetries(false);
    
    // Cleanup function
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url, method, enabled, fetchWithRetries, ...dependencies]);
  
  return { data, loading, error, refetch };
}

// Helper to clear a specific item or the entire cache
export function clearApiCache(key?: string) {
  if (key) {
    apiCache.delete(key);
  } else {
    apiCache.clear();
  }
}