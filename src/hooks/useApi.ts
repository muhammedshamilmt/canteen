import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Query Keys for cache management
export const queryKeys = {
  users: {
    all: ['users'] as const,
    byAdmission: (admissionNumber: string) => ['users', admissionNumber] as const,
    byTable: (table: string) => ['users', 'table', table] as const,
  },
  students: {
    all: ['students'] as const,
    byTable: (table: string) => ['students', 'table', table] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    visibility: ['attendance', 'visibility'] as const,
  },
  overview: ['overview'] as const,
  messages: ['messages'] as const,
  settings: {
    all: ['settings'] as const,
    passkey: ['settings', 'passkey'] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    status: ['admin', 'status'] as const,
  },
};

// Users API
export const useUsers = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => apiClient.get('/api/users'),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

export const useUser = (admissionNumber: string, options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.users.byAdmission(admissionNumber),
    queryFn: () => apiClient.get(`/api/users?admissionNumber=${admissionNumber}`),
    enabled: !!admissionNumber,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.put('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

// Students API
export const useStudents = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.students.all,
    queryFn: () => apiClient.get('/api/students'),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useStudentsByTable = (table: string, options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.students.byTable(table),
    queryFn: () => apiClient.get(`/api/students/by-table?table=${table}`),
    enabled: !!table,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useStudentDetail = (id: string, options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => apiClient.get(`/api/students/${id}`),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// Attendance API
export const useAttendance = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.attendance.all,
    queryFn: () => apiClient.get('/api/attendance'),
    staleTime: 1 * 60 * 1000, // 1 minute for real-time data
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
    ...options,
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/api/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
};

// Overview API
export const useOverview = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => apiClient.get('/api/overview'),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// Messages API
export const useMessages = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.messages,
    queryFn: () => apiClient.get('/api/messages'),
    staleTime: 1 * 60 * 1000,
    ...options,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/api/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages });
    },
  });
};

// Settings API
export const usePasskey = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.settings.passkey,
    queryFn: () => apiClient.get('/api/settings/passkey'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useGeneratePasskey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/api/settings/passkey'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.passkey });
    },
  });
};

// Admin API
export const useAdminStats = (options?: UseQueryOptions<any>) => {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => apiClient.get('/api/admin/dashboard-stats'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    ...options,
  });
};

// Prefetch utility
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchUsers = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.all,
      queryFn: () => apiClient.get('/api/users'),
    });
  };

  const prefetchStudents = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.students.all,
      queryFn: () => apiClient.get('/api/students'),
    });
  };

  const prefetchOverview = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.overview,
      queryFn: () => apiClient.get('/api/overview'),
    });
  };

  return { prefetchUsers, prefetchStudents, prefetchOverview };
};
