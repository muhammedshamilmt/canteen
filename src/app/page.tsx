// app/page.tsx
'use client';

import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MealTotalsCard from "@/components/home/MealTotalsCard";
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { data: attendanceSummary, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => apiClient.get('/api/attendance'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <>
      <Navbar />
      <HeroSection />
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Loading Meal Data</h3>
              <p className="text-sm text-gray-500">Fetching attendance information...</p>
            </div>
          </div>
        ) : (
          <MealTotalsCard attendanceSummary={attendanceSummary as any} />
        )}
      </div>
      <FeaturesSection />
      <Footer/>
    </>
  );
}
