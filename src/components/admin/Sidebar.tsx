'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  LogOut, GraduationCap, Home, ChevronRight, BarChart2
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Overview', path: '/admin/overview', icon: BarChart2 },
  { title: 'Students', path: '/admin/students', icon: GraduationCap },
  { title: 'Users', path: '/admin/users', icon: Users },
  { title: 'Messages', path: '/admin/messages', icon: MessageSquare },
];

const generalItems = [
  { title: 'Settings', path: '/admin/settings', icon: Settings },
  { title: 'Return to Site', path: '/', icon: Home },
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="bg-white h-screen w-64 fixed left-0 top-0 z-20 flex flex-col shadow-sm border-r border-gray-100">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">CT</span>
        </div>
        <span className="text-lg font-bold text-gray-900">CanteenTracker</span>
      </div>

      {/* Menu */}
      <div className="px-4 mt-2">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">Menu</p>
        <nav className="space-y-0.5">
          {menuItems.map(({ title, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive(path)
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
              <span className="flex-1">{title}</span>
              {isActive(path) && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          ))}
        </nav>
      </div>

      {/* General */}
      <div className="px-4 mt-6">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">General</p>
        <nav className="space-y-0.5">
          {generalItems.map(({ title, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <Icon size={18} className="shrink-0" />
              <span>{title}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Bottom card */}
      <div className="mt-auto mx-4 mb-5">
        <div className="bg-emerald-600 rounded-2xl p-4 text-white">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-3">
            <GraduationCap size={16} className="text-white" />
          </div>
          <p className="text-sm font-semibold leading-tight">Manage your canteen with ease</p>
          <p className="text-xs text-emerald-100 mt-1">Track meals, students & attendance</p>
          <Link
            href="/tables"
            className="mt-3 block text-center bg-white text-emerald-700 text-xs font-semibold py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            View Tables
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
