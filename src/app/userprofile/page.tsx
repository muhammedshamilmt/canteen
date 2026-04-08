'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Coffee, Egg, Sandwich, CupSoda, Utensils, Check, X, CalendarDays } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MealAttendance {
  present: boolean;
}

interface NextDayAttendance {
  coffee?: MealAttendance;
  breakfast?: MealAttendance;
  lunch?: MealAttendance;
  tea?: MealAttendance;
  dinner?: MealAttendance;
  isSick?: boolean;
}

interface User {
  admissionNumber: string;
  fullName: string;
  role: string;
  email: string;
  class: string;
  campus: string;
  attendance: {
    coffee: MealAttendance;
    breakfast: MealAttendance;
    lunch: MealAttendance;
    tea: MealAttendance;
    dinner: MealAttendance;
  };
  isSick?: boolean;
  nextDayAttendance?: NextDayAttendance;
}

const mealTimes = [
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'breakfast', label: 'Breakfast', icon: Egg },
  { id: 'lunch', label: 'Lunch', icon: Sandwich },
  { id: 'tea', label: 'Tea', icon: CupSoda },
  { id: 'dinner', label: 'Dinner', icon: Utensils },
];

const getTomorrowLabel = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const UserProfile = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockMessage, setLockMessage] = useState<string>('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(storedUser);
    fetchUserData(userData.admissionNumber);
  }, [router]);

  const fetchUserData = async (admissionNumber: string) => {
    try {
      const response = await fetch(`/api/users?admissionNumber=${admissionNumber}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      const userData = await response.json();

      if (!userData.attendance) {
        userData.attendance = {
          coffee: { present: true },
          breakfast: { present: true },
          lunch: { present: true },
          tea: { present: true },
          dinner: { present: true },
        };
      }

      setUser(userData);
    } catch (error) {
      toast.error('Failed to load user data');
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Today attendance toggle — removed: students can only mark for tomorrow

  // Tomorrow attendance toggle
  const handleNextDayAttendanceClick = async (mealId: string) => {
    if (!user) return;
    const nextDay = user.nextDayAttendance || {};
    const isSickTomorrow = nextDay.isSick ?? false;
    if (isSickTomorrow) {
      toast.error('Cannot update attendance while marked as sick for tomorrow');
      return;
    }

    try {
      // Current next-day status: if not set, inherit from today
      const currentMeal = nextDay[mealId as keyof NextDayAttendance] as MealAttendance | undefined;
      const todayStatus = user.attendance[mealId as keyof typeof user.attendance];
      const currentPresent = currentMeal !== undefined ? currentMeal.present : todayStatus.present;
      const newPresent = !currentPresent;

      const response = await fetch('/api/attendance/next-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNumber: user.admissionNumber, meal: mealId, present: newPresent }),
      });

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 403) setLockMessage(err.error);
        throw new Error(err.error || 'Failed to update');
      }
      setLockMessage('');

      setUser({
        ...user,
        nextDayAttendance: {
          ...nextDay,
          [mealId]: { present: newPresent },
        },
      });

      toast.success(`Tomorrow: marked as ${newPresent ? 'present' : 'absent'} for ${mealTimes.find(m => m.id === mealId)?.label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update tomorrow attendance');
    }
  };

  const handleToggleSickTomorrow = async () => {
    if (!user) return;
    const nextDay = user.nextDayAttendance || {};
    const currentlySickTomorrow = nextDay.isSick ?? false;

    try {
      const response = await fetch('/api/attendance/next-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionNumber: user.admissionNumber, isSick: !currentlySickTomorrow }),
      });
      if (!response.ok) {
        const err = await response.json();
        if (response.status === 403) setLockMessage(err.error);
        throw new Error(err.error || 'Failed to update');
      }
      setLockMessage('');

      setUser({ ...user, nextDayAttendance: { ...nextDay, isSick: !currentlySickTomorrow } });
      toast.success(`Tomorrow: marked as ${!currentlySickTomorrow ? 'sick' : 'not sick'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getNextDayStatus = (mealId: string): boolean => {
    if (!user) return true;
    const nextDay = user.nextDayAttendance;
    const meal = nextDay?.[mealId as keyof NextDayAttendance] as MealAttendance | undefined;
    if (meal !== undefined) return meal.present;
    // Fall back to today's status if tomorrow not set
    return user.attendance[mealId as keyof typeof user.attendance]?.present ?? true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
            <div className="w-12 h-12 border-4 border-blue-500 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700">Loading Profile</h2>
            <p className="text-sm text-gray-500 mt-1">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isSickTomorrow = user.nextDayAttendance?.isSick ?? false;

  return (
    <div className="flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">User Profile</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Info */}
          <Card className="md:col-span-1">
            <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div><p className="text-sm text-gray-500">Name</p><p className="font-medium">{user.fullName}</p></div>
                <div><p className="text-sm text-gray-500">Admission Number</p><p className="font-medium">{user.admissionNumber}</p></div>
                <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{user.email}</p></div>
                <div><p className="text-sm text-gray-500">Role</p><p className="font-medium capitalize">{user.role}</p></div>
                <div><p className="text-sm text-gray-500">Class</p><p className="font-medium capitalize">{user.class}</p></div>
                <div><p className="text-sm text-gray-500">Campus</p><p className="font-medium capitalize">{user.campus}</p></div>
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="sick-tomorrow" className="text-sm text-gray-500">Mark as Sick (Tomorrow)</Label>
                  <Switch
                    id="sick-tomorrow"
                    checked={isSickTomorrow}
                    onCheckedChange={handleToggleSickTomorrow}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tomorrow's Attendance */}
          <div className="md:col-span-2">
            {!isSickTomorrow ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-orange-500" />
                    Tomorrow&apos;s Attendance
                  </CardTitle>
                  <CardDescription>Pre-mark your meals for {getTomorrowLabel()}</CardDescription>
                </CardHeader>
                <CardContent>
                  {lockMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                      <X className="h-4 w-4 shrink-0" />
                      {lockMessage}
                    </div>
                  )}
                  <div className="space-y-3">
                    {mealTimes.map((meal) => {
                      const present = getNextDayStatus(meal.id);
                      return (
                        <div
                          key={meal.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            present ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'
                          }`}
                          onClick={() => handleNextDayAttendanceClick(meal.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <meal.icon className="h-5 w-5 mr-3" />
                              <span className="font-medium">{meal.label}</span>
                            </div>
                            {present ? (
                              <div className="flex items-center text-green-600">
                                <Check className="h-5 w-5 mr-1" /><span className="font-medium">Present</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-red-600">
                                <X className="h-5 w-5 mr-1" /><span className="font-medium">Absent</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-6 text-center text-orange-700">
                  <p className="font-medium">You are marked as sick for tomorrow.</p>
                  <p className="text-sm mt-1">Toggle the sick switch to change this.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
