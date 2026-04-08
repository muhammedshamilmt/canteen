'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Coffee, AlertCircle, Users, RefreshCw, Calendar, CalendarDays } from 'lucide-react';

const MEALS = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'] as const;
type Meal = typeof MEALS[number];

const MEAL_LABELS: Record<Meal, string> = {
  coffee: 'Coffee', breakfast: 'Breakfast', lunch: 'Lunch', tea: 'Tea', dinner: 'Dinner',
};

const MEAL_COLORS: Record<Meal, string> = {
  coffee:    'bg-amber-500',
  breakfast: 'bg-green-500',
  lunch:     'bg-blue-500',
  tea:       'bg-purple-500',
  dinner:    'bg-indigo-500',
};

interface Student {
  _id: string;
  fullName: string;
  admissionNumber: string;
  class: string;
  campus: string;
  tableNumber: string | number;
  isSick: boolean;
  attendance: Record<Meal, { present: boolean }>;
  nextDayAttendance?: Record<Meal, { present: boolean }> & { isSick?: boolean };
}

interface ClassBreakdown {
  class: string;
  total: number;
  sick: number;
  meals: Record<string, number>;
}

export default function AdminOverview() {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMeal, setSelectedMeal] = useState<Meal>('lunch');
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);
  const [activeDay, setActiveDay] = useState<'today' | 'tomorrow'>('today');

  const getTomorrowLabel = () => {
    const t = new Date(); t.setDate(t.getDate() + 1);
    return t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const getTodayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const { data, isLoading, refetch, isFetching } = useQuery<{
    students: Student[];
    classBreakdown: ClassBreakdown[];
  }>({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiClient.get('/api/admin/overview'),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const classes = useMemo(() => {
    const set = new Set(data?.students.map(s => s.class).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [data]);

  const getStudentStatus = (s: Student, meal: Meal) => {
    if (activeDay === 'tomorrow') {
      const nd = s.nextDayAttendance;
      const isSickTomorrow = nd?.isSick ?? s.isSick;
      const presentTomorrow = nd?.[meal]?.present ?? s.attendance[meal]?.present ?? true;
      return { isSick: isSickTomorrow, isPresent: !isSickTomorrow && presentTomorrow };
    }
    return { isSick: s.isSick, isPresent: !s.isSick && (s.attendance[meal]?.present ?? true) };
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.students.filter(s => {
      if (selectedClass !== 'all' && s.class !== selectedClass) return false;
      if (showAbsentOnly) {
        const { isSick, isPresent } = getStudentStatus(s, selectedMeal);
        if (!isSick && isPresent) return false;
      }
      return true;
    });
  }, [data, selectedClass, selectedMeal, showAbsentOnly, activeDay]);

  const mealTotals = useMemo(() => {
    if (!data) return {} as Record<Meal, { present: number; absent: number; sick: number }>;
    const src = selectedClass === 'all' ? data.students : data.students.filter(s => s.class === selectedClass);
    const result = {} as Record<Meal, { present: number; absent: number; sick: number }>;
    for (const meal of MEALS) {
      result[meal] = { present: 0, absent: 0, sick: 0 };
      for (const s of src) {
        const { isSick, isPresent } = getStudentStatus(s, meal);
        if (isSick) result[meal].sick++;
        else if (isPresent) result[meal].present++;
        else result[meal].absent++;
      }
    }
    return result;
  }, [data, selectedClass, activeDay]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">All students with real-time attendance status</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Day toggle */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              onClick={() => setActiveDay('today')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors ${
                activeDay === 'today' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar size={13} />
              Today
            </button>
            <button
              onClick={() => setActiveDay('tomorrow')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium transition-colors ${
                activeDay === 'tomorrow' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarDays size={13} />
              Tomorrow
            </button>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Meal summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {MEALS.map(meal => {
          const t = mealTotals[meal];
          const isActive = selectedMeal === meal;
          return (
            <button
              key={meal}
              onClick={() => setSelectedMeal(meal)}
              className={`rounded-xl p-3 text-left transition-all border-2 ${
                isActive ? 'border-emerald-500 bg-emerald-50' : 'border-transparent bg-white hover:bg-gray-50'
              } shadow-sm`}
            >
              <div className={`w-2 h-2 rounded-full ${MEAL_COLORS[meal]} mb-2`} />
              <p className="text-xs font-semibold text-gray-700">{MEAL_LABELS[meal]}</p>
              {isLoading ? (
                <div className="h-5 w-12 bg-gray-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {t?.present ?? 0}
                  <span className="text-xs font-normal text-gray-400 ml-1">/ {(t?.present ?? 0) + (t?.absent ?? 0) + (t?.sick ?? 0)}</span>
                </p>
              )}
              {!isLoading && (t?.absent ?? 0) > 0 && (
                <p className="text-[11px] text-red-500 mt-0.5">{t.absent} absent</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Class Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Attendance by Class — <span className="text-emerald-600">{MEAL_LABELS[selectedMeal]}</span>
        </h2>
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 w-28 bg-gray-50 rounded-xl animate-pulse shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(data?.classBreakdown || []).map(cls => {
              const present = cls.meals[selectedMeal] ?? 0;
              const pct = cls.total > 0 ? Math.round((present / cls.total) * 100) : 0;
              const isSelected = selectedClass === cls.class;
              const color = pct >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                : pct >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
                : 'text-red-600 bg-red-50 border-red-200';
              return (
                <button
                  key={cls.class}
                  onClick={() => setSelectedClass(isSelected ? 'all' : cls.class)}
                  className={`shrink-0 rounded-xl border-2 p-3 text-center transition-all min-w-[90px] ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-transparent'
                  } ${color}`}
                >
                  <p className="text-xs font-bold">{cls.class}</p>
                  <p className="text-xl font-bold mt-0.5">{present}</p>
                  <p className="text-[11px] opacity-70">/ {cls.total}</p>
                  {cls.sick > 0 && (
                    <p className="text-[10px] bg-orange-100 text-orange-600 rounded-full px-1.5 mt-1 inline-block">{cls.sick} sick</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
          <Users size={14} className="text-gray-400" />
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="text-sm text-gray-700 bg-transparent outline-none"
          >
            {classes.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Classes' : `Class ${c}`}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
          <Coffee size={14} className="text-gray-400" />
          <select
            value={selectedMeal}
            onChange={e => setSelectedMeal(e.target.value as Meal)}
            className="text-sm text-gray-700 bg-transparent outline-none"
          >
            {MEALS.map(m => <option key={m} value={m}>{MEAL_LABELS[m]}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowAbsentOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all shadow-sm ${
            showAbsentOnly
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <AlertCircle size={14} />
          {showAbsentOnly ? 'Showing absent only' : 'Show absent only'}
        </button>

        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Student Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No students match the current filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(student => {
            const { isSick, isPresent } = getStudentStatus(student, selectedMeal);
            const isAbsent = !isSick && !isPresent;

            const cardStyle = isSick
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : isAbsent
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-white border-gray-100 text-gray-800';

            const dotStyle = isSick
              ? 'bg-orange-400'
              : isAbsent
              ? 'bg-red-500'
              : 'bg-emerald-500';

            return (
              <div
                key={student._id}
                className={`rounded-xl border-2 p-3 transition-all hover:shadow-md ${cardStyle}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dotStyle}`} />
                  {student.class && (
                    <span className="text-[10px] font-bold bg-black/5 px-1.5 py-0.5 rounded-md">
                      {student.class}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold leading-tight truncate">{student.fullName}</p>
                <p className="text-[11px] opacity-60 mt-0.5 font-mono">{student.admissionNumber}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    isSick ? 'bg-orange-100 text-orange-700'
                    : isAbsent ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isSick ? 'Sick' : isAbsent ? 'Absent' : 'Present'}
                  </span>
                  {student.tableNumber && (
                    <span className="text-[10px] opacity-50">T{student.tableNumber}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
