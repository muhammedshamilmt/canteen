import { QueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

// All API endpoints that have in-memory cache entries
const CACHED_ENDPOINTS = [
  '/api/students',
  '/api/users',
  '/api/attendance',
  '/api/messages',
  '/api/overview',
  '/api/settings',
  '/api/admin/dashboard-stats',
  '/api/admin/overview',
];

// Query keys that map to each endpoint
const QUERY_KEY_MAP: Record<string, string[][]> = {
  students:   [['students'], ['admin', 'stats'], ['admin', 'overview']],
  users:      [['users'],    ['admin', 'stats'], ['admin', 'overview']],
  attendance: [['attendance'], ['admin', 'overview'], ['admin', 'stats'], ['overview']],
  messages:   [['messages']],
  settings:   [['settings']],
};

export function invalidateAfterMutation(
  queryClient: QueryClient,
  domain: keyof typeof QUERY_KEY_MAP
) {
  // 1. Clear in-memory API client cache for all endpoints
  CACHED_ENDPOINTS.forEach(ep => apiClient.clearCacheEntry(ep));

  // 2. Invalidate + immediately refetch all related React Query keys
  const keys = QUERY_KEY_MAP[domain] || [];
  keys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.refetchQueries({ queryKey: key });
  });
}
