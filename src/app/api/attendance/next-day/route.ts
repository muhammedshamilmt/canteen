import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

type MealType = 'coffee' | 'breakfast' | 'lunch' | 'tea' | 'dinner';
const MEALS: MealType[] = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'];

// Returns true if current time falls within the lock window (supports overnight spans)
async function isLocked(): Promise<{ locked: boolean; message: string }> {
  try {
    const client = await clientPromise;
    const db = client.db();
    const settings = await db.collection('settings').findOne({ key: 'global' } as any);
    const start: string = settings?.attendanceLockStart || '';
    const end: string = settings?.attendanceLockEnd || '';
    if (!start || !end) return { locked: false, message: '' };

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Overnight span: e.g. 18:00 – 00:00 or 22:00 – 06:00
    const locked = start < end
      ? hhmm >= start && hhmm < end          // same-day window
      : hhmm >= start || hhmm < end;         // overnight window

    if (locked) {
      return { locked: true, message: `Attendance changes are locked between ${start} and ${end}.` };
    }
    return { locked: false, message: '' };
  } catch {
    return { locked: false, message: '' };
  }
}

// GET: fetch next-day attendance summary (same shape as /api/attendance)
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const allStudents = await db.collection('students').find({}).toArray();
    const allUsers = await db.collection('users').find({}).toArray();
    const userMap = new Map(allUsers.map(u => [u.admissionNumber, u]));

    const summary: Record<string, any> = {};

    for (const meal of MEALS) {
      const presentStudents: any[] = [];
      const absentStudents: any[] = [];
      const sickStudents: any[] = [];
      const campusTotals: Record<string, number> = {};

      for (const student of allStudents) {
        const campus = (student.campus || 'unknown').toLowerCase();
        if (!campusTotals[campus]) campusTotals[campus] = 0;

        const user = userMap.get(student.admissionNumber);
        const info = {
          id: student._id.toString(),
          fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          class: student.class || '',
          admissionNumber: student.admissionNumber || '',
          campus,
        };

        // Use nextDayAttendance if set, otherwise fall back to current attendance
        const nextDay = user?.nextDayAttendance;
        const isSickTomorrow = nextDay?.isSick ?? user?.isSick ?? false;

        if (isSickTomorrow) {
          sickStudents.push(info);
        } else if (nextDay?.[meal]?.present === false) {
          absentStudents.push(info);
        } else if (!nextDay && user?.attendance?.[meal]?.present === false) {
          absentStudents.push(info);
        } else {
          presentStudents.push(info);
          campusTotals[campus]++;
        }
      }

      summary[meal] = {
        total: allStudents.length,
        present: presentStudents.length,
        absent: absentStudents.length,
        sick: sickStudents.length,
        presentStudents,
        absentStudents,
        sickStudents,
        campusTotals,
      };
    }

    const sickUsers = allUsers.filter(u => u.nextDayAttendance?.isSick ?? u.isSick);
    const sickStudentList = sickUsers
      .map(u => {
        const student = allStudents.find(s => s.admissionNumber === u.admissionNumber);
        if (!student) return null;
        return {
          id: student._id.toString(),
          fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          class: student.class || '',
          admissionNumber: student.admissionNumber || '',
          campus: (student.campus || '').toLowerCase(),
        };
      })
      .filter(Boolean);

    summary.totalSick = sickStudentList.length;
    summary.sickStudents = sickStudentList;

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching next-day attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch next-day attendance' }, { status: 500 });
  }
}

// POST: mark a meal for tomorrow
export async function POST(request: Request) {
  try {
    const lock = await isLocked();
    if (lock.locked) {
      return NextResponse.json({ error: lock.message }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db();
    const { admissionNumber, meal, present, isSick } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number is required' }, { status: 400 });
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (meal) {
      updateFields[`nextDayAttendance.${meal}.present`] = present ?? false;
    }

    if (typeof isSick === 'boolean') {
      updateFields['nextDayAttendance.isSick'] = isSick;
    }

    await db.collection('users').updateOne(
      { admissionNumber },
      { $set: updateFields },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating next-day attendance:', error);
    return NextResponse.json({ error: 'Failed to update next-day attendance' }, { status: 500 });
  }
}

// PUT: bulk update all meals for tomorrow
export async function PUT(request: Request) {
  try {
    const lock = await isLocked();
    if (lock.locked) {
      return NextResponse.json({ error: lock.message }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db();
    const { admissionNumber, attendance, isSick } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number is required' }, { status: 400 });
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (attendance) {
      for (const meal of MEALS) {
        if (meal in attendance) {
          updateFields[`nextDayAttendance.${meal}.present`] = attendance[meal]?.present ?? true;
        }
      }
    }

    if (typeof isSick === 'boolean') {
      updateFields['nextDayAttendance.isSick'] = isSick;
    }

    await db.collection('users').updateOne(
      { admissionNumber },
      { $set: updateFields },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating next-day attendance:', error);
    return NextResponse.json({ error: 'Failed to update next-day attendance' }, { status: 500 });
  }
}
