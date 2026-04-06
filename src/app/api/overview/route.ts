import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Document } from 'mongodb';
import { addCacheHeaders } from '@/lib/cache-headers';

interface Student extends Document {
  _id: string;
  fullName: string;
  campus: string;
  class: string;
  admissionNumber: string;
  isSick?: boolean;
  attendance?: {
    [key: string]: {
      present: boolean;
    };
  };
}

interface MealAttendance {
  present: number;
  absent: number;
  sick: number;
  presentStudents: Student[];
  absentStudents: Student[];
  sickStudents: Student[];
  campusTotals: Record<string, number>;
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

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Get all students
    const students = await db.collection('users').find({}).toArray() as unknown as Student[];

    // Initialize attendance summary
    const attendanceSummary: AttendanceSummary = {
      coffee: {
        present: 0,
        absent: 0,
        sick: 0,
        presentStudents: [],
        absentStudents: [],
        sickStudents: [],
        campusTotals: {}
      },
      breakfast: {
        present: 0,
        absent: 0,
        sick: 0,
        presentStudents: [],
        absentStudents: [],
        sickStudents: [],
        campusTotals: {}
      },
      lunch: {
        present: 0,
        absent: 0,
        sick: 0,
        presentStudents: [],
        absentStudents: [],
        sickStudents: [],
        campusTotals: {}
      },
      tea: {
        present: 0,
        absent: 0,
        sick: 0,
        presentStudents: [],
        absentStudents: [],
        sickStudents: [],
        campusTotals: {}
      },
      dinner: {
        present: 0,
        absent: 0,
        sick: 0,
        presentStudents: [],
        absentStudents: [],
        sickStudents: [],
        campusTotals: {}
      },
      totalSick: 0,
      sickStudents: []
    };

    // Get sick students
    const sickStudents = students.filter(student => student.isSick);
    attendanceSummary.totalSick = sickStudents.length;
    attendanceSummary.sickStudents = sickStudents;

    // Process attendance for each student
    students.forEach((student: Student) => {
      const campus = student.campus?.toLowerCase();
      if (!campus) return;

      // Process each meal
      ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'].forEach(meal => {
        const mealAttendance = attendanceSummary[meal as keyof Omit<AttendanceSummary, 'totalSick' | 'sickStudents'>];
        
        // Initialize campus total if not exists
        if (!mealAttendance.campusTotals[campus]) {
          mealAttendance.campusTotals[campus] = 0;
        }

        if (student.isSick) {
          mealAttendance.sick++;
          mealAttendance.sickStudents.push(student);
        } else if (student.attendance?.[meal]?.present) {
          mealAttendance.present++;
          mealAttendance.presentStudents.push(student);
          mealAttendance.campusTotals[campus]++;
        } else {
          mealAttendance.absent++;
          mealAttendance.absentStudents.push(student);
        }
      });
    });

    // Calculate grand totals for each meal type
    const grandTotals = {
      coffee: 0,
      breakfast: 0,
      lunch: 0,
      tea: 0,
      dinner: 0
    };

    // Sum up totals for each meal type across all campuses
    Object.values(attendanceSummary).forEach((mealData: any) => {
      if (mealData && typeof mealData === 'object' && 'present' in mealData) {
        const mealType = Object.keys(grandTotals).find(key => 
          attendanceSummary[key as keyof Omit<AttendanceSummary, 'totalSick' | 'sickStudents'>] === mealData
        );
        if (mealType) {
          grandTotals[mealType as keyof typeof grandTotals] = mealData.present;
        }
      }
    });

    return NextResponse.json({
      attendanceSummary,
      grandTotals,
      totalSick: attendanceSummary.totalSick,
      sickStudents: attendanceSummary.sickStudents.map(student => ({
        fullName: student.fullName,
        class: student.class,
        admissionNumber: student.admissionNumber,
        campus: student.campus
      }))
    }, {
      headers: addCacheHeaders({}, 'short')
    });
  } catch (error) {
    console.error('Error in overview API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    );
  }
} 