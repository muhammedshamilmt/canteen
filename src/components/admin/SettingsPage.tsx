'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Loader2, Clock } from 'lucide-react';

const DEFAULTS = {
  email: '', currentPassword: '', newPassword: '', confirmPassword: '',
  allowPublicTableView: true, enableNotifications: true, darkMode: false,
  numberOfTables: 10,
  attendanceLockStart: '',
  attendanceLockEnd: '',
};

const SettingsPage = () => {
  const [localSettings, setLocalSettings] = useState(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get<any>('/api/settings'),
    staleTime: 10 * 60 * 1000,
  });

  // Populate form when data arrives
  useEffect(() => {
    if (data) {
      setLocalSettings(prev => ({
        ...prev,
        ...data,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/api/settings', data),
    onSuccess: () => toast.success('Settings saved successfully'),
    onError: () => toast.error('Failed to save settings'),
  });

  const set = (field: string, value: any) => setLocalSettings(p => ({ ...p, [field]: value }));

  const isValidLockWindow = () => {
    const { attendanceLockStart, attendanceLockEnd } = localSettings;
    // Both empty = disabled (valid)
    if (!attendanceLockStart && !attendanceLockEnd) return true;
    // Both must be set
    if (!attendanceLockStart || !attendanceLockEnd) return false;
    // Start must differ from end (overnight spans like 18:00–00:00 are allowed)
    return attendanceLockStart !== attendanceLockEnd;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Manage your admin preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input id="email" type="email" value={localSettings.email} onChange={e => set('email', e.target.value)} />
          </div>
          <Separator />
          <div className="space-y-4">
            {[
              { key: 'allowPublicTableView', label: 'Public Table View', desc: 'Allow non-authenticated users to view table status' },
              { key: 'enableNotifications', label: 'Enable Notifications', desc: 'Receive email notifications for new messages and alerts' },
              { key: 'darkMode', label: 'Dark Mode', desc: 'Use dark theme across the admin panel' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={(localSettings as any)[key]} onChange={e => set(key, e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="numberOfTables">Number of Tables</Label>
            <div className="w-full md:w-1/3">
              <Input id="numberOfTables" type="number" min="1" max="100" value={localSettings.numberOfTables} onChange={e => set('numberOfTables', parseInt(e.target.value) || 10)} />
            </div>
            <p className="text-sm text-muted-foreground">Set the total number of tables in the canteen</p>
          </div>
          <Separator />

          {/* Attendance Lock Window */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <h3 className="font-medium">Attendance Lock Window</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Students cannot mark or change their attendance during this time window. Leave both empty to disable.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <Label htmlFor="lockStart">From</Label>
                <Input
                  id="lockStart"
                  type="time"
                  value={localSettings.attendanceLockStart}
                  onChange={e => set('attendanceLockStart', e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lockEnd">To</Label>
                <Input
                  id="lockEnd"
                  type="time"
                  value={localSettings.attendanceLockEnd}
                  onChange={e => set('attendanceLockEnd', e.target.value)}
                  className="w-36"
                />
              </div>
              {localSettings.attendanceLockStart && localSettings.attendanceLockEnd && (
                <div className="pt-5">
                  <span className="text-sm px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                    Locked {localSettings.attendanceLockStart} – {localSettings.attendanceLockEnd}
                  </span>
                </div>
              )}
            </div>
            {!isValidLockWindow() && (
              <p className="text-sm text-red-500">Both start and end times are required.</p>
            )}
            {localSettings.attendanceLockStart && localSettings.attendanceLockEnd && (
              <button
                onClick={() => { set('attendanceLockStart', ''); set('attendanceLockEnd', ''); }}
                className="text-xs text-gray-400 hover:text-red-500 underline"
              >
                Clear lock window
              </button>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={() => saveMutation.mutate(localSettings)}
              disabled={saveMutation.isPending || !isValidLockWindow()}
            >
              {saveMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                : <><SettingsIcon className="h-4 w-4 mr-2" />Save Settings</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
