// API Client with request deduplication and caching
type RequestCache = {
  promise: Promise<any>;
  timestamp: number;
};

const requestCache = new Map<string, RequestCache>();
const responseCache = new Map<string, { data: any; timestamp: number; etag?: string }>();
const DEDUP_WINDOW = 100; // 100ms deduplication window
const CACHE_DURATION = 60000; // 1 minute in-memory cache

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private getFromCache(cacheKey: string): any | null {
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(cacheKey: string, data: any, etag?: string): void {
    responseCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  private async dedupedFetch(url: string, options?: RequestInit): Promise<Response> {
    const cacheKey = this.getCacheKey(url, options);
    const now = Date.now();
    
    // For GET requests, check in-memory cache first
    if (!options?.method || options.method === 'GET') {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Check if there's a recent identical request
    const cached = requestCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < DEDUP_WINDOW) {
      return cached.promise;
    }

    // Add ETag support for GET requests
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse?.etag && (!options?.method || options.method === 'GET')) {
      headers['If-None-Match'] = cachedResponse.etag;
    }

    // Create new request
    const promise = fetch(url, {
      ...options,
      headers,
    }).then(async (response) => {
      // Handle 304 Not Modified
      if (response.status === 304 && cachedResponse) {
        return new Response(JSON.stringify(cachedResponse.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Cache successful GET responses
      if (response.ok && (!options?.method || options.method === 'GET')) {
        const etag = response.headers.get('ETag');
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        this.setCache(cacheKey, data, etag || undefined);
      }

      return response;
    });

    // Cache the promise
    requestCache.set(cacheKey, { promise, timestamp: now });

    // Clean up after request completes
    promise.finally(() => {
      setTimeout(() => {
        const entry = requestCache.get(cacheKey);
        if (entry && entry.timestamp === now) {
          requestCache.delete(cacheKey);
        }
      }, DEDUP_WINDOW);
    });

    return promise;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.dedupedFetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.dedupedFetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.dedupedFetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.dedupedFetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.dedupedFetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  // Clear all caches
  clearCache(): void {
    requestCache.clear();
    responseCache.clear();
  }

  // Clear specific cache entry
  clearCacheEntry(endpoint: string): void {
    const cacheKey = this.getCacheKey(endpoint);
    responseCache.delete(cacheKey);
  }
}

export const apiClient = ApiClient.getInstance();
