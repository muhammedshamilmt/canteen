'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Edit, Trash, Plus, FileDown, FileText, Eye, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/utils/export';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import * as XLSX from 'xlsx';
import { invalidateAfterMutation } from '@/lib/cache-invalidate';

interface Student {
  _id?: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  phoneNumber?: string;
  class: '8' | '9' | 'P1' | 'P2' | 'D1' | 'D2' | 'D3' | 'PG 1' | '';
  campus: 'dawa academy' | 'hifz' | 'daiya stafs' | 'ayadi' | 'office stafs';
  tableNumber: number;
  isPresent: boolean;
}

const StudentsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [newStudent, setNewStudent] = useState<Omit<Student, '_id'>>({
    firstName: '', lastName: '', admissionNumber: '', phoneNumber: '',
    class: '8', campus: 'dawa academy', tableNumber: 1, isPresent: false
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  const AVAILABLE_CLASSES = ['8','9', 'P1', 'P2', 'D1', 'D2', 'D3','PG 1'];
  const AVAILABLE_CAMPUSES = ['dawa academy', 'hifz', 'daiya stafs','ayadi','office stafs'];

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => {
      apiClient.clearCacheEntry('/api/students');
      return apiClient.get('/api/students');
    },
    staleTime: 0,
    gcTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/api/students', data),
    onSuccess: () => { invalidateAfterMutation(queryClient, 'students'); setIsDialogOpen(false); toast.success('Student updated successfully'); },
    onError: (e: any) => toast.error(e.message || 'Failed to update student'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/students', data),
    onSuccess: () => { invalidateAfterMutation(queryClient, 'students'); setIsAddDialogOpen(false); setNewStudent({ firstName: '', lastName: '', admissionNumber: '', phoneNumber: '', class: '8', campus: 'dawa academy', tableNumber: 1, isPresent: false }); toast.success('Student added successfully'); },
    onError: (e: any) => toast.error(e.message || 'Failed to create student'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/students?id=${id}`),
    onSuccess: () => {
      invalidateAfterMutation(queryClient, 'students');
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
      toast.success('Student deleted successfully');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete student'),
  });

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const importMutation = useMutation({
    mutationFn: (students: any[]) => apiClient.post('/api/students/import', { students }),
    onSuccess: (res: any) => {
      setImportResult(res);
      invalidateAfterMutation(queryClient, 'students');
    },
    onError: (e: any) => toast.error(e.message || 'Import failed'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Normalize headers (case-insensitive)
      const normalized = rows.map(row => {
        const lower: any = {};
        Object.keys(row).forEach(k => { lower[k.toLowerCase().replace(/\s+/g, '')] = row[k]; });
        return {
          firstName: lower['firstname'] || lower['first_name'] || lower['fname'] || '',
          lastName: lower['lastname'] || lower['last_name'] || lower['lname'] || '',
          admissionNumber: String(lower['admissionnumber'] || lower['admission_no'] || lower['admno'] || lower['id'] || ''),
          phoneNumber: String(lower['phonenumber'] || lower['phone'] || lower['mobile'] || ''),
          class: lower['class'] || lower['grade'] || '',
          campus: lower['campus'] || lower['branch'] || '',
          tableNumber: Number(lower['tablenumber'] || lower['table'] || lower['tableno'] || 1),
        };
      }).filter(r => r.firstName);

      setImportPreview(normalized);
      setSelectedRows(new Set(normalized.map((_: any, i: number) => i)));
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      { firstName: 'Ahmed', lastName: '(optional)', admissionNumber: '1001', class: 'D1', campus: 'dawa academy', tableNumber: '(optional)' },
      { firstName: 'Sara', lastName: '', admissionNumber: '1002', class: 'P1', campus: 'hifz', tableNumber: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_template.xlsx');
  };  // Filter students based on search query, selected class, and selected campus
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.tableNumber.toString().includes(searchQuery);
    
    const matchesClass = selectedClass === 'all' || student.class === selectedClass;
    const matchesCampus = selectedCampus === 'all' || student.campus === selectedCampus;
    
    return matchesSearch && matchesClass && matchesCampus;
  });

  const handleEditClick = (student: Student) => {
    setSelectedStudent({...student});
    setIsDialogOpen(true);
  };

  const handleAddStudent = () => {
    setIsAddDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    if (selectedStudent) {
      saveMutation.mutate({
        _id: selectedStudent._id,
        firstName: selectedStudent.firstName,
        lastName: selectedStudent.lastName,
        admissionNumber: selectedStudent.admissionNumber,
        class: selectedStudent.campus === 'dawa academy' ? selectedStudent.class : '',
        campus: selectedStudent.campus,
        tableNumber: selectedStudent.tableNumber,
        oldAdmissionNumber: selectedStudent.admissionNumber
      });
    }
  };

  const handleCreateStudent = async () => {
    const isStaffCampus = ['office stafs', 'ayadi', 'daiya stafs'].includes(newStudent.campus);
    if (!newStudent.firstName || !newStudent.lastName ||
        (isStaffCampus && !newStudent.phoneNumber) ||
        (!isStaffCampus && !newStudent.admissionNumber) ||
        (newStudent.campus === 'dawa academy' && !newStudent.class)) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate({
      ...newStudent,
      admissionNumber: isStaffCampus ? newStudent.phoneNumber : newStudent.admissionNumber,
      class: newStudent.campus === 'dawa academy' ? newStudent.class : ''
    });
  };

  const handleDeleteClick = (id: string) => {
    setStudentToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (studentToDelete) deleteMutation.mutate(studentToDelete);
  };

  const handleExportCSV = () => {
    const exportData = filteredStudents.map(({ _id, ...student }) => ({
      'First Name': student.firstName,
      'Last Name': student.lastName,
      'Admission Number': student.admissionNumber,
      'Class': student.class,
      'Campus': student.campus,
      'Table Number': student.tableNumber,
    }));
    
    exportToCSV(exportData, 'students.csv');
    toast.success('Students data exported to CSV');
  };

  const handleExportPDF = () => {
    const exportData = filteredStudents.map(({ _id, ...student }) => ({
      'First Name': student.firstName,
      'Last Name': student.lastName,
      'Admission Number': student.admissionNumber,
      'Class': student.class,
      'Campus': student.campus,
      'Table Number': student.tableNumber, 
    }));
    
    exportToPDF(exportData, 'students.pdf', 'Students Report');
    toast.success('Students data exported to PDF');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => { setIsImportOpen(true); setImportPreview([]); setImportResult(null); setImportFileName(''); }}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleAddStudent}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>All Students</CardTitle>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="all">All Classes</option>
                {AVAILABLE_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
              >
                <option value="all">All Campuses</option>
                {AVAILABLE_CAMPUSES.map((campus) => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NO</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Admission Number</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student._id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.firstName}</TableCell>
                      <TableCell>{student.lastName}</TableCell>
                      <TableCell>{student.admissionNumber}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.campus}</TableCell>
                      <TableCell>Table {student.tableNumber}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => router.push(`/students/${student.admissionNumber}`)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEditClick(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive" 
                            onClick={() => student._id && handleDeleteClick(student._id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Student Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={selectedStudent.firstName}
                  onChange={(e) => setSelectedStudent({...selectedStudent, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={selectedStudent.lastName}
                  onChange={(e) => setSelectedStudent({...selectedStudent, lastName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campus">Campus</Label>
                <select
                  id="campus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedStudent.campus}
                  onChange={(e) => {
                    const newCampus = e.target.value as Student['campus'];
                    setSelectedStudent({
                      ...selectedStudent, 
                      campus: newCampus,
                      class: newCampus === 'dawa academy' ? selectedStudent.class : '',
                      admissionNumber: '',
                      phoneNumber: ''
                    });
                  }}
                >
                  {AVAILABLE_CAMPUSES.map((campus) => (
                    <option key={campus} value={campus}>{campus}</option>
                  ))}
                </select>
              </div>
              {['office stafs', 'ayadi', 'daiya stafs'].includes(selectedStudent.campus) ? (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={selectedStudent.phoneNumber || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, phoneNumber: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="admissionNumber">Admission Number</Label>
                  <Input
                    id="admissionNumber"
                    value={selectedStudent.admissionNumber}
                    onChange={(e) => setSelectedStudent({...selectedStudent, admissionNumber: e.target.value})}
                  />
                </div>
              )}
              {selectedStudent.campus === 'dawa academy' && (
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <select
                    id="class"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedStudent.class}
                    onChange={(e) => setSelectedStudent({...selectedStudent, class: e.target.value as Student['class']})}
                  >
                    {AVAILABLE_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="tableNumber">Table Number</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  min="1"
                  max="8"
                  value={selectedStudent.tableNumber}
                  onChange={(e) => setSelectedStudent({...selectedStudent, tableNumber: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStudent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFirstName">First Name</Label>
              <Input
                id="newFirstName"
                value={newStudent.firstName}
                onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newLastName">Last Name</Label>
              <Input
                id="newLastName"
                value={newStudent.lastName}
                onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCampus">Campus</Label>
              <select
                id="newCampus"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newStudent.campus}
                onChange={(e) => {
                  const newCampus = e.target.value as Student['campus'];
                  setNewStudent({
                    ...newStudent, 
                    campus: newCampus,
                    class: newCampus === 'dawa academy' ? newStudent.class : '',
                    admissionNumber: '',
                    phoneNumber: ''
                  });
                }}
              >
                {AVAILABLE_CAMPUSES.map((campus) => (
                  <option key={campus} value={campus}>{campus}</option>
                ))}
              </select>
            </div>
            {['office stafs', 'ayadi', 'daiya stafs'].includes(newStudent.campus) ? (
              <div className="space-y-2">
                <Label htmlFor="newPhoneNumber">Phone Number</Label>
                <Input
                  id="newPhoneNumber"
                  value={newStudent.phoneNumber}
                  onChange={(e) => setNewStudent({...newStudent, phoneNumber: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="newAdmissionNumber">Admission Number</Label>
                <Input
                  id="newAdmissionNumber"
                  value={newStudent.admissionNumber}
                  onChange={(e) => setNewStudent({...newStudent, admissionNumber: e.target.value})}
                />
              </div>
            )}
            {newStudent.campus === 'dawa academy' && (
              <div className="space-y-2">
                <Label htmlFor="newClass">Class</Label>
                <select
                  id="newClass"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newStudent.class}
                  onChange={(e) => setNewStudent({...newStudent, class: e.target.value as Student['class']})}
                >
                  {AVAILABLE_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newTableNumber">Table Number</Label>
              <Input
                id="newTableNumber"
                type="number"
                min="1"
                max="8"
                value={newStudent.tableNumber}
                onChange={(e) => setNewStudent({...newStudent, tableNumber: parseInt(e.target.value) || 1})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateStudent}>Add Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete this student? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteStudent}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={v => { setIsImportOpen(v); if (!v) { setImportPreview([]); setImportResult(null); setImportFileName(''); setSelectedRows(new Set()); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              Import Students
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Template download */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">Need a template?</p>
                <p className="text-xs text-blue-600">Download the Excel template with correct column headers</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
                <FileDown className="h-4 w-4 mr-1" />
                Template
              </Button>
            </div>

            {/* File upload */}
            {!importPreview.length && !importResult && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Upload File (.xlsx, .xls, .csv)</Label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                  <Upload className="h-7 w-7 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500">{importFileName || 'Click to upload or drag & drop'}</span>
                  <span className="text-xs text-gray-400 mt-0.5">Supports .xlsx, .xls, .csv</span>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}

            {/* Student list preview with checkboxes */}
            {importPreview.length > 0 && !importResult && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    {importPreview.length} students detected
                    <span className="ml-2 text-xs text-gray-400">({selectedRows.size} selected)</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRows(new Set(importPreview.map((_, i) => i)))}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedRows(new Set())}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Deselect all
                    </button>
                    <span className="text-gray-300">|</span>
                    <label className="text-xs text-blue-500 hover:underline cursor-pointer">
                      Change file
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="overflow-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 w-8">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedRows.size === importPreview.length}
                              onChange={e => setSelectedRows(e.target.checked ? new Set(importPreview.map((_, i) => i)) : new Set())}
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">First Name</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Last Name</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Admission No</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Class</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Campus</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Table</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importPreview.map((row, i) => (
                          <tr key={i} className={`hover:bg-gray-50 transition-colors ${selectedRows.has(i) ? 'bg-emerald-50/40' : ''}`}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={selectedRows.has(i)}
                                onChange={e => {
                                  const next = new Set(selectedRows);
                                  e.target.checked ? next.add(i) : next.delete(i);
                                  setSelectedRows(next);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.firstName}</td>
                            <td className="px-3 py-2 text-gray-700">{row.lastName}</td>
                            <td className="px-3 py-2 text-gray-600">{row.admissionNumber || row.phoneNumber || '—'}</td>
                            <td className="px-3 py-2">
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-medium">{row.class || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-600 capitalize">{row.campus || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.tableNumber || 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    importMutation.mutate([row]);
                                    setImportPreview(prev => prev.filter((_, idx) => idx !== i));
                                    const next = new Set(selectedRows);
                                    next.delete(i);
                                    setSelectedRows(next);
                                    toast.success(`${row.firstName} ${row.lastName} added`);
                                    queryClient.refetchQueries({ queryKey: ['students'] });
                                  }}
                                  className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-md font-medium transition-colors"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => {
                                    setImportPreview(prev => prev.filter((_, idx) => idx !== i));
                                    const next = new Set(selectedRows);
                                    next.delete(i);
                                    setSelectedRows(next);
                                  }}
                                  className="text-[11px] bg-red-50 text-red-500 hover:bg-red-100 px-2 py-1 rounded-md font-medium transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Import complete</p>
                    <p className="text-xs text-emerald-600">
                      {importResult.inserted} inserted · {importResult.skipped} skipped (duplicates)
                    </p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {importResult.errors.length} errors
                    </p>
                    <ul className="text-xs text-red-600 space-y-0.5 max-h-20 overflow-y-auto">
                      {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setImportPreview([]); setImportResult(null); setImportFileName(''); setSelectedRows(new Set()); }}>
                  Import more
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 mt-2">
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Close</Button>
            {importPreview.length > 0 && !importResult && (
              <Button
                onClick={() => {
                  const toImport = selectedRows.size > 0
                    ? importPreview.filter((_, i) => selectedRows.has(i))
                    : importPreview;
                  importMutation.mutate(toImport);
                }}
                disabled={importMutation.isPending || (selectedRows.size === 0 && importPreview.length === 0)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {importMutation.isPending
                  ? 'Importing...'
                  : selectedRows.size > 0
                    ? `Add ${selectedRows.size} Selected`
                    : `Add All ${importPreview.length} Students`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsPage;
