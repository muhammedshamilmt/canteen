'use client';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { useState } from 'react';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
        gcTime: 30 * 60 * 1000, // 30 minutes - cache time (formerly cacheTime)
        refetchOnWindowFocus: true, // Refetch when window regains focus
        refetchOnReconnect: true, // Refetch when reconnecting
        refetchOnMount: 'always', // Always refetch on mount
        retry: 3, // Retry failed requests 3 times
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        networkMode: 'online', // Only fetch when online
        refetchInterval: false, // Disable auto-refetch by default (enable per query)
      },
      mutations: {
        retry: 2,
        networkMode: 'online',
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen flex flex-col">
          <main className="flex-grow">{children}</main>
        </div>
      </TooltipProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default AppProviders; 