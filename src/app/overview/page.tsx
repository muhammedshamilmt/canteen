'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee, Egg, Sandwich, CupSoda, Utensils, Loader2, Calendar, CalendarDays } from 'lucide-react';
import MealAttendanceTable from '@/components/tables/MealAttendanceTable';
import { toast } from 'sonner';

type Campus = 'dawa academy' | 'hifz' | 'daiya stafs' | 'ayadi' | 'office stafs';

interface Student {
  _id: string;
  fullName: string;
  class: string;
  admissionNumber: string;
  campus: string;
  isSick?: boolean;
}

interface MealAttendance {
  present: number;
  absent: number;
  sick: number;
  presentStudents: Student[];
  absentStudents: Student[];
  sickStudents: Student[];
  campusTotals: Record<Campus, number>;
}

interface AttendanceSummary {
  coffee: MealAttendance;
  breakfast: MealAttendance;
  lunch: MealAttendance;
  tea: MealAttendance;
  dinner: MealAttendance;
  totalSick: number;
  sickStudents: Student[];
}

const AVAILABLE_CAMPUSES: Campus[] = ['dawa academy', 'hifz', 'daiya stafs', 'ayadi', 'office stafs'];

const mealTimes = [
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'breakfast', label: 'Breakfast', icon: Egg },
  { id: 'lunch', label: 'Lunch', icon: Sandwich },
  { id: 'tea', label: 'Tea', icon: CupSoda },
  { id: 'dinner', label: 'Dinner', icon: Utensils },
];

const mealColors = {
  coffee:    { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-800' },
  breakfast: { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-800' },
  lunch:     { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
  tea:       { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-800' },
  dinner:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-600',    badge: 'bg-red-100 text-red-800' },
};

const getTomorrowLabel = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const getTodayLabel = () => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const Overview = () => {
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [nextDaySummary, setNextDaySummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataHidden, setIsDataHidden] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeDay, setActiveDay] = useState<'today' | 'tomorrow'>('today');

  const processMealData = (mealData: any): MealAttendance => {
    if (!mealData) return { present: 0, absent: 0, sick: 0, presentStudents: [], absentStudents: [], sickStudents: [], campusTotals: {} as any };
    return { ...mealData, campusTotals: mealData.campusTotals || {} };
  };

  const fetchAttendanceSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const [todayRes, tomorrowRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/attendance/next-day'),
      ]);

      if (!todayRes.ok) throw new Error('Failed to fetch today attendance');
      if (!tomorrowRes.ok) throw new Error('Failed to fetch tomorrow attendance');

      const todayData = await todayRes.json();
      const tomorrowData = await tomorrowRes.json();

      setAttendanceSummary({
        coffee: processMealData(todayData.coffee),
        breakfast: processMealData(todayData.breakfast),
        lunch: processMealData(todayData.lunch),
        tea: processMealData(todayData.tea),
        dinner: processMealData(todayData.dinner),
        totalSick: todayData.totalSick,
        sickStudents: todayData.sickStudents,
      });

      setNextDaySummary({
        coffee: processMealData(tomorrowData.coffee),
        breakfast: processMealData(tomorrowData.breakfast),
        lunch: processMealData(tomorrowData.lunch),
        tea: processMealData(tomorrowData.tea),
        dinner: processMealData(tomorrowData.dinner),
        totalSick: tomorrowData.totalSick,
        sickStudents: tomorrowData.sickStudents,
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceSummary();
    fetch('/api/attendance/visibility')
      .then(r => r.json())
      .then(d => { setIsDataHidden(d.isHidden); setHideReason(d.reason); })
      .catch(() => {});
    fetch('/api/admin/status')
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false));

    const interval = setInterval(fetchAttendanceSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAttendanceSummary]);

  const activeSummary = activeDay === 'today' ? attendanceSummary : nextDaySummary;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Overview</h1>
          <p className="text-gray-600">View attendance statistics across all campuses</p>
        </div>

        {/* Day toggle */}
        <div className="flex rounded-lg border overflow-hidden mb-6 w-fit">
          <button
            onClick={() => setActiveDay('today')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeDay === 'today' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Today
          </button>
          <button
            onClick={() => setActiveDay('tomorrow')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeDay === 'tomorrow' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Tomorrow
          </button>
        </div>

        {isDataHidden ? (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="font-medium text-lg mb-2">Attendance Data is Currently Hidden</h3>
                <p className="text-gray-600">{hideReason}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {isAdmin ? 'You can toggle the visibility in settings.' : 'Please check back later.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Loading Overview</h3>
              <p className="text-sm text-gray-500">Fetching attendance data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeDay === 'tomorrow' && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                Showing pre-marked attendance for tomorrow ({getTomorrowLabel()}). Students can update this from their profile.
              </div>
            )}

            {/* Meal Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {mealTimes.map((meal) => {
                const mealData = activeSummary?.[meal.id as keyof Omit<AttendanceSummary, 'totalSick' | 'sickStudents'>];
                const totalStudents = (mealData?.present || 0) + (mealData?.absent || 0) + (mealData?.sick || 0);
                const colors = mealColors[meal.id as keyof typeof mealColors];
                return (
                  <Card key={meal.id} className={`${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <meal.icon className={`h-8 w-8 mb-2 ${colors.icon}`} />
                        <h3 className="font-medium text-lg mb-2">{meal.label}</h3>
                        <Badge variant="secondary" className={`${colors.badge} text-lg px-4 py-1`}>
                          {totalStudents}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <MealAttendanceTable
              attendanceSummary={activeSummary}
              availableCampuses={AVAILABLE_CAMPUSES}
            />

            {/* Sick Students */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-4">
                  Sick Students {activeDay === 'tomorrow' ? '(Tomorrow)' : '(Today)'}
                </h3>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-yellow-800">Total Sick Students</h4>
                    <p className="text-sm text-yellow-600">Across dawa campus</p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-lg px-4 py-2">
                    {activeSummary?.totalSick || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Overview;
