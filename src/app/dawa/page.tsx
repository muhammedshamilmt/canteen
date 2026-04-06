'use client'

import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TableGrid from '@/components/tables/TableGrid';
import TableModal from '@/components/tables/TableModal';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Coffee, Egg, Sandwich, CupSoda, Utensils, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const CAMPUS = 'dawa academy';

const mealTimes = [
  { id: 'coffee',    label: 'Coffee',    icon: Coffee },
  { id: 'breakfast', label: 'Breakfast', icon: Egg },
  { id: 'lunch',     label: 'Lunch',     icon: Sandwich },
  { id: 'tea',       label: 'Tea',       icon: CupSoda },
  { id: 'dinner',    label: 'Dinner',    icon: Utensils },
];

const DawaAcademy = () => {
  const queryClient = useQueryClient();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedMealDetails, setSelectedMealDetails] = useState<{ meal: string; type: string; students: any[] } | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const isAdmin = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin'
    : false;

  const { data: rawAttendance, isLoading } = useQuery<any>({
    queryKey: ['attendance'],
    queryFn: () => apiClient.get('/api/attendance'),
    staleTime: 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  const { data: visibility } = useQuery<any>({
    queryKey: ['attendance', 'visibility'],
    queryFn: () => apiClient.get('/api/attendance/visibility'),
    staleTime: 60 * 1000,
  });

  const visibilityMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/api/attendance/visibility', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', 'visibility'] }),
  });

  const filterMeal = (mealData: any) => {
    if (!mealData) return { present: 0, absent: 0, sick: 0, presentStudents: [], absentStudents: [], sickStudents: [], campusTotals: {} };
    return {
      ...mealData,
      presentStudents: (mealData.presentStudents || []).filter((s: any) => s.campus === CAMPUS),
      absentStudents:  (mealData.absentStudents  || []).filter((s: any) => s.campus === CAMPUS),
      present: (mealData.presentStudents || []).filter((s: any) => s.campus === CAMPUS).length,
      absent:  (mealData.absentStudents  || []).filter((s: any) => s.campus === CAMPUS).length,
    };
  };

  const attendanceSummary = rawAttendance ? {
    coffee:    filterMeal(rawAttendance.coffee),
    breakfast: filterMeal(rawAttendance.breakfast),
    lunch:     filterMeal(rawAttendance.lunch),
    tea:       filterMeal(rawAttendance.tea),
    dinner:    filterMeal(rawAttendance.dinner),
    totalSick: rawAttendance.totalSick,
    sickStudents: (rawAttendance.sickStudents || []).filter((s: any) => s.campus === CAMPUS),
  } : null;

  const isDataHidden = visibility?.isHidden || false;

  const handleMealClick = (meal: string, type: string, students: any[]) => {
    setSelectedMealDetails({ meal, type, students });
    setIsDetailsDialogOpen(true);
  };

  const handleSaveReason = () => {
    if (!hideReason.trim()) { toast.error('Please provide a reason'); return; }
    visibilityMutation.mutate({ isHidden: true, reason: hideReason.trim() });
    setIsReasonDialogOpen(false);
    toast.success('Attendance data is now hidden');
  };

  const handleConfirmShowData = () => {
    visibilityMutation.mutate({ isHidden: false, reason: '' });
    setIsConfirmDialogOpen(false);
    toast.success('Attendance data is now visible');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dawa Academy Campus</h1>
            <p className="text-gray-600">
              {isDataHidden ? 'Attendance data is currently hidden' : 'View all tables and their current attendance status'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="data-visibility"
                  checked={isDataHidden}
                  onCheckedChange={checked => checked ? setIsReasonDialogOpen(true) : setIsConfirmDialogOpen(true)}
                />
                <Label htmlFor="data-visibility" className="flex items-center gap-2">
                  {isDataHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {isDataHidden ? 'Show Data' : 'Hide Data'}
                </Label>
              </div>
            )}
            {!isDataHidden && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    {selectedMeal ? `Filter: ${mealTimes.find(m => m.id === selectedMeal)?.label}` : 'Filter by Meal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setSelectedMeal(null)}>Show All</Button>
                    {mealTimes.map(meal => (
                      <Button key={meal.id} variant="ghost" className="w-full justify-start" onClick={() => setSelectedMeal(meal.id)}>
                        <meal.icon className="mr-2 h-4 w-4" />{meal.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {isDataHidden ? (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6 text-center">
              <h3 className="font-medium text-lg mb-2">Attendance Data is Currently Hidden</h3>
              <p className="text-gray-600">{visibility?.reason}</p>
              <p className="text-sm text-gray-500 mt-2">
                {isAdmin ? 'You can toggle the visibility using the switch above.' : 'Please check back later.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 mb-6 grid-cols-1 md:grid-cols-3">
            {/* Present */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-3">Present Students</h3>
                {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-green-600" /></div> : (
                  <div className="grid grid-cols-5 gap-2">
                    {mealTimes.map(meal => {
                      const d = attendanceSummary?.[meal.id as keyof typeof attendanceSummary] as any;
                      return (
                        <div key={meal.id} className="flex flex-col items-center p-2 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                          onClick={() => handleMealClick(meal.label, 'present', d?.presentStudents || [])}>
                          <meal.icon className="h-5 w-5 text-green-600 mb-1" />
                          <Badge variant="secondary" className="bg-green-100 text-green-800">{d?.present || 0}</Badge>
                          <span className="text-xs mt-1">{meal.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sick */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-3">Sick Students</h3>
                {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-yellow-600" /></div> : (
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold text-yellow-600 mb-2">{attendanceSummary?.totalSick || 0}</div>
                    <p className="text-sm text-yellow-700">Total Sick Students</p>
                    <Button variant="ghost" className="mt-4 text-yellow-700 hover:bg-yellow-100"
                      onClick={() => handleMealClick('All Meals', 'sick', attendanceSummary?.sickStudents || [])}>
                      View All Sick Students
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Absent */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <h3 className="font-medium text-lg mb-3">Absent Students</h3>
                {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-red-600" /></div> : (
                  <div className="grid grid-cols-5 gap-2">
                    {mealTimes.map(meal => {
                      const d = attendanceSummary?.[meal.id as keyof typeof attendanceSummary] as any;
                      return (
                        <div key={meal.id} className="flex flex-col items-center p-2 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                          onClick={() => handleMealClick(meal.label, 'absent', d?.absentStudents || [])}>
                          <meal.icon className="h-5 w-5 text-red-600 mb-1" />
                          <Badge variant="secondary" className="bg-red-100 text-red-800">{d?.absent || 0}</Badge>
                          <span className="text-xs mt-1">{meal.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <TableGrid onOpenTableDetails={id => { setSelectedTableId(id); setIsModalOpen(true); }} selectedMeal={selectedMeal} selectedCampus={CAMPUS} />
        <TableModal tableId={selectedTableId ? parseInt(selectedTableId) : null} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

        {/* Student Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedMealDetails?.meal} — {selectedMealDetails?.type === 'present' ? 'Present' : selectedMealDetails?.type === 'sick' ? 'Sick' : 'Absent'} Students
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {selectedMealDetails?.students.map((student: any, i: number) => (
                  <div key={student._id || i} className={`p-3 rounded-lg border transition-colors ${
                    selectedMealDetails.type === 'present' ? 'border-green-200 bg-green-50' :
                    selectedMealDetails.type === 'sick'    ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50'}`}>
                    <p className="font-medium">{student.fullName || student.name}</p>
                    <p className="text-sm text-gray-600">Class: {student.class} · {student.admissionNumber}</p>
                  </div>
                ))}
                {!selectedMealDetails?.students.length && (
                  <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-lg">No students found</div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Hide Reason Dialog */}
        <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Hide Attendance Data</DialogTitle></DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason" className="mb-2 block">Reason for hiding:</Label>
              <Textarea id="reason" value={hideReason} onChange={e => setHideReason(e.target.value)} placeholder="Enter reason..." className="min-h-[100px]" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReasonDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveReason} disabled={!hideReason.trim()}>Hide Data</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Show Confirm Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Show Attendance Data</DialogTitle></DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">Are you sure you want to make the attendance data visible again?</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmShowData}>Show Data</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default DawaAcademy;
