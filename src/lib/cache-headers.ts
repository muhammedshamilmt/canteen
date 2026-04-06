// Cache control utilities for API routes

export const cacheHeaders = {
  // No caching - for sensitive or frequently changing data
  noCache: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  
  // Short cache - 1 minute (for real-time data like attendance)
  short: {
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
  },
  
  // Medium cache - 5 minutes (for semi-static data like user lists)
  medium: {
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
  },
  
  // Long cache - 1 hour (for static data like settings)
  long: {
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
  },
  
  // Very long cache - 24 hours (for rarely changing data)
  veryLong: {
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
  },
};

export function addCacheHeaders(headers: HeadersInit, cacheType: keyof typeof cacheHeaders = 'medium'): HeadersInit {
  return {
    ...headers,
    ...cacheHeaders[cacheType],
  };
}

// Generate ETag from data
export function generateETag(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(36)}"`;
}
