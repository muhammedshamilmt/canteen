'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  GraduationCap, Users, MessageSquare, ArrowUpRight,
  TrendingUp, Coffee, Utensils, Moon, AlertCircle, Activity,
  Download, FileSpreadsheet, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface Stats {
  totalStudents: number;
  totalUsers: number;
  totalMessages: number;
  sickUsers: number;
  activeUsers: number;
  mealStats: Record<string, number>;
  weeklyData: { name: string; students: number }[];
  campusBreakdown: { _id: string; count: number }[];
  recentUsers: {
    fullName: string;
    admissionNumber: string;
    campus: string;
    class: string;
    isSick: boolean;
    createdAt: string;
  }[];
}

// ── Export Button ──────────────────────────────────────────────────────────
function ExportButton({ data, totalUsers }: { data: any[]; totalUsers: number }) {
  const [open, setOpen] = React.useState(false);
  const [withTable, setWithTable] = React.useState(false);
  const [students, setStudents] = React.useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(false);

  const fetchStudents = async () => {
    if (students.length > 0) return students;
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setStudents(data);
      return data;
    } finally {
      setLoadingStudents(false);
    }
  };

  const buildRows = (studs: any[]) =>
    studs.map((s, i) => ({
      'No': i + 1,
      'Full Name': s.fullName || '',
      'Admission No': s.admissionNumber || '',
      'Class': s.class || '',
      'Campus': s.campus || '',
      ...(withTable ? { 'Table No': s.tableNumber || '' } : {}),
      'Coffee': s.attendance?.coffee?.present ? 'Present' : 'Absent',
      'Breakfast': s.attendance?.breakfast?.present ? 'Present' : 'Absent',
      'Lunch': s.attendance?.lunch?.present ? 'Present' : 'Absent',
      'Tea': s.attendance?.tea?.present ? 'Present' : 'Absent',
      'Dinner': s.attendance?.dinner?.present ? 'Present' : 'Absent',
      'Status': s.isSick ? 'Sick' : 'Active',
    }));

  const exportExcel = async () => {
    const studs = await fetchStudents();
    const rows = buildRows(studs);
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 16 },
      ...(withTable ? [{ wch: 10 }] : []),
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Class summary sheet
    const summaryRows = data.map(cls => ({
      'Class': cls._id || 'Unknown',
      'Total Students': cls.total,
      'Present (Lunch)': cls.presentLunch,
      'Absent': cls.total - cls.presentLunch,
      'Sick': cls.sick,
      'Attendance %': cls.total > 0 ? `${Math.round((cls.presentLunch / cls.total) * 100)}%` : '0%',
    }));
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Class Summary');

    XLSX.writeFile(wb, `attendance_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setOpen(false);
  };

  const exportCSV = async () => {
    const studs = await fetchStudents();
    const rows = buildRows(studs);
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Download size={13} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-52">
          {/* Table number toggle */}
          <label className="flex items-center gap-2 px-1 py-1.5 mb-2 cursor-pointer">
            <div
              onClick={() => setWithTable(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors relative ${withTable ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${withTable ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">Include Table No.</span>
          </label>

          <div className="space-y-1">
            <button
              onClick={exportExcel}
              disabled={loadingStudents}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              {loadingStudents ? 'Loading...' : 'Export as Excel (.xlsx)'}
            </button>
            <button
              onClick={exportCSV}
              disabled={loadingStudents}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
            >
              <Download size={14} className="text-blue-500" />
              {loadingStudents ? 'Loading...' : 'Export as CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ── Meal Icons ──────────────────────────────────────────────────────────────
const MEAL_ICONS: Record<string, React.ReactNode> = {
  coffee: <Coffee size={14} />,
  breakfast: <Utensils size={14} />,
  lunch: <Utensils size={14} />,
  tea: <Coffee size={14} />,
  dinner: <Moon size={14} />,
};

const BAR_COLORS = ['#d1fae5', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46'];

export default function AdminDashboard() {
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.email) setAdminName(user.email.split('@')[0]);
  }, []);

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get('/api/admin/dashboard-stats'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? 0,
      sub: 'Registered',
      icon: <GraduationCap size={20} />,
      bg: 'bg-emerald-600',
      light: 'bg-emerald-50',
      text: 'text-emerald-600',
      href: '/admin/students',
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers ?? 0,
      sub: 'Accounts',
      icon: <Users size={20} />,
      bg: 'bg-blue-500',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      href: '/admin/users',
    },
    {
      label: 'Sick Today',
      value: stats?.sickUsers ?? 0,
      sub: 'Reported sick',
      icon: <AlertCircle size={20} />,
      bg: 'bg-orange-500',
      light: 'bg-orange-50',
      text: 'text-orange-600',
      href: '/admin/users',
    },
    {
      label: 'Messages',
      value: stats?.totalMessages ?? 0,
      sub: 'Total messages',
      icon: <MessageSquare size={20} />,
      bg: 'bg-purple-500',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      href: '/admin/messages',
    },
  ];

  const meals = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'];

  // Fetch attendance data same way as MealTotalsCard
  const { data: attendanceData } = useQuery<any>({
    queryKey: ['attendance'],
    queryFn: () => apiClient.get('/api/attendance'),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track meals, students and attendance at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 capitalize">{adminName}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link href={card.href} key={card.label}>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${card.light} ${card.text} flex items-center justify-center`}>
                  {card.icon}
                </div>
                <ArrowUpRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="mt-4">
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                )}
                <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <TrendingUp size={11} className="text-emerald-500" />
                  {card.sub}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Attendance Analytics</h2>
              <p className="text-xs text-gray-400">Lunch attendance — last 7 days</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-600 font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
              <Activity size={11} /> Live
            </span>
          </div>
          {isLoading ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats?.weeklyData || []} barSize={32} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f0fdf4' }}
                />
                <Bar dataKey="students" radius={[6, 6, 6, 6]}>
                  {(stats?.weeklyData || []).map((_, i, arr) => (
                    <Cell
                      key={i}
                      fill={i === arr.length - 1 ? '#059669' : BAR_COLORS[i] || '#d1fae5'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Class Attendance Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900">Attendance by Class</h2>
            <ExportButton data={stats?.campusBreakdown || []} totalUsers={stats?.totalUsers || 0} />
          </div>
          <p className="text-xs text-gray-400 mb-4">Lunch attendance count per class</p>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {(stats?.campusBreakdown || []).map((cls: any, i: number) => {
                const pct = cls.total > 0 ? Math.round((cls.presentLunch / cls.total) * 100) : 0;
                const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
                const badgeColor = pct >= 80 ? 'bg-emerald-50 text-emerald-700' : pct >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
                return (
                  <div key={i} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                      {cls._id || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">Class {cls._id}</span>
                        <div className="flex items-center gap-1.5">
                          {cls.sick > 0 && (
                            <span className="text-[10px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full">{cls.sick} sick</span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                            {cls.presentLunch}/{cls.total}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!stats?.campusBreakdown || stats.campusBreakdown.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-6">No class data available</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Meal Stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Today's Meals</h2>
          <p className="text-xs text-gray-400 mb-4">Present count per meal</p>
          <div className="space-y-3">
            {meals.map((meal) => {
              const count = stats?.mealStats?.[meal] ?? 0;
              const total = stats?.totalUsers || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={meal} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    {MEAL_ICONS[meal]}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 capitalize">{meal}</span>
                      <span className="text-gray-400">{count}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Users */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Users</h2>
              <p className="text-xs text-gray-400">Latest registered accounts</p>
            </div>
            <Link href="/admin/users" className="text-xs text-emerald-600 font-medium hover:underline">
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(stats?.recentUsers || []).map((user, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{user.fullName}</p>
                    <p className="text-xs text-gray-400 truncate capitalize">{user.campus} · {user.class || 'N/A'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    user.isSick
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {user.isSick ? 'Sick' : 'Active'}
                  </span>
                </div>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-6">No users yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
