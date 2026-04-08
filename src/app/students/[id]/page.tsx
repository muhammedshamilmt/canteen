'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterMutation } from '@/lib/cache-invalidate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  Activity, AlertCircle, CheckCircle, XCircle, Coffee,
  Utensils, Moon, Egg, CupSoda
} from 'lucide-react';
import { format } from 'date-fns';

const MEAL_ICONS: Record<string, React.ReactNode> = {
  coffee:    <Coffee size={16} />,
  breakfast: <Egg size={16} />,
  lunch:     <Utensils size={16} />,
  tea:       <CupSoda size={16} />,
  dinner:    <Moon size={16} />,
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // Optimistic state for today's meals and sick status
  const [optimisticMeals, setOptimisticMeals] = useState<Record<string, boolean>>({});
  const [optimisticSick, setOptimisticSick] = useState<boolean | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => apiClient.get<any>(`/api/students/${id}`),
    staleTime: 2 * 60 * 1000,
    // Reset optimistic state when fresh data arrives
    select: (d) => d,
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ meal, present }: { meal: string; present: boolean }) =>
      apiClient.post('/api/attendance', {
        admissionNumber: data?.student?.admissionNumber,
        meal,
        present,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      invalidateAfterMutation(queryClient, 'attendance');
    },
    onError: (_, vars) => {
      // Revert optimistic update
      setOptimisticMeals(prev => {
        const reverted = { ...prev };
        delete reverted[vars.meal];
        return reverted;
      });
      toast.error('Failed to update attendance');
    },
  });

  const sickMutation = useMutation({
    mutationFn: (isSick: boolean) =>
      apiClient.post('/api/attendance', {
        admissionNumber: data?.student?.admissionNumber,
        isSick,
      }),
    onSuccess: (_, isSick) => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      invalidateAfterMutation(queryClient, 'attendance');
      toast.success(isSick ? 'Marked as sick' : 'Marked as active');
    },
    onError: () => {
      setOptimisticSick(null);
      toast.error('Failed to update status');
    },
  });

  const handleMealToggle = (meal: string, currentPresent: boolean) => {
    const newPresent = !currentPresent;
    // Instant optimistic update
    setOptimisticMeals(prev => ({ ...prev, [meal]: newPresent }));
    attendanceMutation.mutate({ meal, present: newPresent });
    toast.success(`${meal} marked as ${newPresent ? 'present' : 'absent'}`);
  };

  const handleSickToggle = () => {
    const current = optimisticSick !== null ? optimisticSick : (data?.user?.isSick ?? false);
    const next = !current;
    setOptimisticSick(next);
    if (next) setOptimisticMeals({}); // clear meal overrides when marking sick
    sickMutation.mutate(next);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Student Not Found</h2>
              <p className="text-gray-600 mb-4">
                The student you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, user, attendanceHistory, leaveHistory, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Student Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Student Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center pb-4 border-b">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold">
                    {student.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold">{student.fullName}</h2>
                  <p className="text-gray-600">{student.admissionNumber}</p>
                  <Badge 
                    variant={(optimisticSick !== null ? optimisticSick : stats.currentStatus === 'sick') ? 'destructive' : 'default'}
                    className="mt-2 cursor-pointer select-none"
                    onClick={handleSickToggle}
                  >
                    {(optimisticSick !== null ? optimisticSick : stats.currentStatus === 'sick')
                      ? '🤒 Sick — click to clear'
                      : '✓ Active — click to mark sick'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <InfoRow 
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={student.email || user?.email || 'N/A'}
                  />
                  <InfoRow 
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={student.phone || 'N/A'}
                  />
                  <InfoRow 
                    icon={<MapPin className="h-4 w-4" />}
                    label="Campus"
                    value={student.campus || 'N/A'}
                  />
                  <InfoRow 
                    icon={<Activity className="h-4 w-4" />}
                    label="Class"
                    value={student.class || 'N/A'}
                  />
                  <InfoRow 
                    icon={<Calendar className="h-4 w-4" />}
                    label="Table"
                    value={student.table || 'N/A'}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatRow label="Days Tracked" value={stats.totalDaysTracked} />
                <StatRow label="Total Leaves" value={stats.totalLeaves} />
                <StatRow 
                  label="Attendance Rate" 
                  value={`${calculateAttendanceRate(attendanceHistory)}%`}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Attendance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Today's Meal Attendance</span>
                  <span className="text-xs font-normal text-gray-400">Click to toggle</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['coffee', 'breakfast', 'lunch', 'tea', 'dinner'].map((meal) => {
                    const isSick = optimisticSick !== null ? optimisticSick : (user?.isSick ?? false);
                    const serverPresent = user?.attendance?.[meal]?.present ?? true;
                    const isPresent = isSick ? false : (meal in optimisticMeals ? optimisticMeals[meal] : serverPresent);
                    const isAbsent = !isSick && !isPresent;

                    return (
                      <button
                        key={meal}
                        disabled={isSick}
                        onClick={() => !isSick && handleMealToggle(meal, isPresent)}
                        className={`p-3 rounded-xl border-2 text-center transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                          isSick
                            ? 'bg-orange-50 border-orange-200'
                            : isAbsent
                            ? 'bg-red-50 border-red-300'
                            : 'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="flex justify-center mb-1.5 text-gray-600">
                          {MEAL_ICONS[meal]}
                        </div>
                        <p className="text-xs font-semibold capitalize text-gray-700">{meal}</p>
                        <p className={`text-[11px] mt-0.5 font-medium ${
                          isSick ? 'text-orange-500' : isAbsent ? 'text-red-500' : 'text-emerald-600'
                        }`}>
                          {isSick ? 'Sick' : isAbsent ? 'Absent' : 'Present'}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {(optimisticSick !== null ? optimisticSick : user?.isSick) && (
                  <p className="text-xs text-orange-500 mt-3 text-center">
                    Student is marked sick — click the status badge above to clear
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Leave/Sick History */}
            <Card>
              <CardHeader>
                <CardTitle>Leave & Sick History</CardTitle>
              </CardHeader>
              <CardContent>
                {leaveHistory && leaveHistory.length > 0 ? (
                  <div className="space-y-3">
                    {leaveHistory.map((leave: any, index: number) => (
                      <LeaveHistoryItem key={index} leave={leave} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No leave history found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance History (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceHistoryList
                  history={attendanceHistory}
                  admissionNumber={data?.student?.admissionNumber}
                  queryClient={queryClient}
                  studentId={id}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  );
}

function LeaveHistoryItem({ leave }: { leave: any }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <p className="font-medium">{leave.reason || 'Sick Leave'}</p>
          <Badge variant="outline">{leave.type || 'sick'}</Badge>
        </div>
        <p className="text-sm text-gray-600">
          {leave.startDate && format(new Date(leave.startDate), 'MMM dd, yyyy')}
          {leave.endDate && ` - ${format(new Date(leave.endDate), 'MMM dd, yyyy')}`}
        </p>
        {leave.notes && (
          <p className="text-sm text-gray-500 mt-1">{leave.notes}</p>
        )}
      </div>
    </div>
  );
}

function AbsentFilterToggle() {
  // This is a display-only component; state is lifted via a module-level ref trick.
  // We use a custom event to communicate with AttendanceHistoryList.
  return null; // rendered inline in AttendanceHistoryList
}

function AttendanceHistoryList({
  history,
  admissionNumber,
  queryClient,
  studentId,
}: {
  history: any[];
  admissionNumber: string;
  queryClient: QueryClient;
  studentId: string;
}) {
  const [absentOnly, setAbsentOnly] = useState(false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Record<string, boolean>>>({});

  const toggleMeal = async (date: string, meal: string, currentPresent: boolean) => {
    const newPresent = !currentPresent;
    // Optimistic update
    setOptimisticUpdates(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [meal]: newPresent },
    }));

    try {
      await fetch('/api/attendance/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNumber, date, meal, present: newPresent }),
      });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
    } catch {
      // Revert on error
      setOptimisticUpdates(prev => ({
        ...prev,
        [date]: { ...(prev[date] || {}), [meal]: currentPresent },
      }));
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
        <p>No attendance history found</p>
      </div>
    );
  }

  const MEALS = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'];

  // Filter: absent-only means at least one meal was absent that day
  const displayed = absentOnly
    ? history.filter(r => Object.values(r.meals || {}).some(v => !v))
    : history;

  return (
    <div className="space-y-3">
      {/* Filter toggle */}
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="text-sm text-gray-500">{displayed.length} day{displayed.length !== 1 ? 's' : ''} shown</span>
        <button
          onClick={() => setAbsentOnly(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            absentOnly
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          {absentOnly ? '✕ Absent days only' : 'Show absent days only'}
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">No absent days found</div>
      ) : (
        displayed.map((record: any, index: number) => {
          const dateKey = record.date;
          const overrides = optimisticUpdates[dateKey] || {};
          const meals = { ...(record.meals || {}), ...overrides };
          const absentMeals = MEALS.filter(m => meals[m] === false);
          const presentMeals = MEALS.filter(m => meals[m] !== false);

          return (
            <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <p className="font-medium text-sm">
                    {record.date && format(new Date(record.date), 'EEEE, MMM dd, yyyy')}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  absentMeals.length === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : absentMeals.length === MEALS.length
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {presentMeals.length}/{MEALS.length} present
                </span>
              </div>

              {/* Meal pills — click to toggle */}
              <div className="flex gap-1.5 flex-wrap">
                {MEALS.map(meal => {
                  const present = meals[meal] !== false;
                  return (
                    <button
                      key={meal}
                      onClick={() => toggleMeal(dateKey, meal, present)}
                      title={`${meal}: ${present ? 'Present — click to mark absent' : 'Absent — click to mark present'}`}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all hover:scale-105 ${
                        present
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-red-100 text-red-600 border border-red-200'
                      }`}
                    >
                      {MEAL_ICONS[meal]}
                      <span className="capitalize">{meal}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AttendanceHistoryItem({ record }: { record: any }) {
  const presentMeals = Object.entries(record.meals || {}).filter(([_, present]) => present).length;
  const totalMeals = Object.keys(record.meals || {}).length;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-gray-500" />
        <div>
          <p className="font-medium">
            {record.date && format(new Date(record.date), 'EEEE, MMM dd, yyyy')}
          </p>
          <p className="text-sm text-gray-600">
            {presentMeals} of {totalMeals} meals attended
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        {Object.entries(record.meals || {}).map(([meal, present]: [string, any]) => (
          <div
            key={meal}
            className={`w-2 h-8 rounded ${present ? 'bg-green-500' : 'bg-red-300'}`}
            title={`${meal}: ${present ? 'Present' : 'Absent'}`}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}

function calculateAttendanceRate(history: any[]): number {
  if (!history || history.length === 0) return 0;
  
  let totalMeals = 0;
  let attendedMeals = 0;
  
  history.forEach(record => {
    if (record.meals) {
      Object.values(record.meals).forEach((present: any) => {
        totalMeals++;
        if (present) attendedMeals++;
      });
    }
  });
  
  return totalMeals > 0 ? Math.round((attendedMeals / totalMeals) * 100) : 0;
}
