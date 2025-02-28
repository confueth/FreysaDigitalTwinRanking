import { useState, useEffect } from 'react';
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

// Shared cache across hook instances
const apiCache = new Map<string, CacheItem<any>>();

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

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const finalConfig = { ...config, signal: controller.signal };
    
    // Check cache first if a cache key is provided
    if (cacheKey && apiCache.has(cacheKey)) {
      const cachedItem = apiCache.get(cacheKey)!;
      const now = Date.now();
      
      if (now - cachedItem.timestamp < cacheDuration) {
        console.log(`Using cached data for ${cacheKey}`);
        setData(cachedItem.data);
        return;
      } else {
        console.log(`Cache expired for ${cacheKey}, fetching fresh data`);
        apiCache.delete(cacheKey);
      }
    }

    let retryCount = 0;
    let timeout: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios({
          url,
          method,
          ...finalConfig
        });
        
        setData(response.data);
        
        // Cache the response if cacheKey is provided
        if (cacheKey) {
          apiCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
        }
        
        onSuccess?.(response.data);
      } catch (err) {
        // Properly type the error
        const error = err as Error;
        const axiosError = err as AxiosError;
        
        // Only retry if not cancelled and not reached max retries
        if (axios.isCancel(err)) {
          // Request was cancelled, ignore
          return;
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying request (${retryCount}/${maxRetries})...`);
          
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          timeout = setTimeout(fetchData, delay);
          return;
        }
        
        setError(error);
        onError?.(error);
        
        // Show toast notification for failures
        // Create safe error message
        let errorMessage = error.message;
        if (axios.isAxiosError(err)) {
          const responseData = axiosError.response?.data as any;
          errorMessage = responseData?.message || error.message;
        }
        
        toast({
          title: "Request failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
      if (timeout) clearTimeout(timeout);
    };
  }, [url, method, ...dependencies]);

  const refetch = async () => {
    if (cacheKey) {
      apiCache.delete(cacheKey);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios({
        url,
        method,
        ...config
      });
      
      setData(response.data);
      
      if (cacheKey) {
        apiCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }
      
      onSuccess?.(response.data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      
      // Create safe error message
      let errorMessage = error.message;
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        const responseData = axiosError.response?.data as any;
        errorMessage = responseData?.message || error.message;
      }
      
      toast({
        title: "Refresh failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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