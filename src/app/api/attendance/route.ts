import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { addCacheHeaders } from '@/lib/cache-headers';

type MealType = 'coffee' | 'breakfast' | 'lunch' | 'tea' | 'dinner';
const MEALS: MealType[] = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Total headcount comes from students collection
    const allStudents = await db.collection('students').find({}).toArray();

    // Absence/sick data comes from users collection
    const allUsers = await db.collection('users').find({}).toArray();

    // Build a quick lookup: admissionNumber -> user
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
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          class: student.class || '',
          admissionNumber: student.admissionNumber || '',
          campus,
        };

        if (user?.isSick) {
          // Sick — counts as absent for all meals
          sickStudents.push(info);
        } else if (user && user.attendance?.[meal]?.present === false) {
          // Explicitly marked absent for this meal
          absentStudents.push(info);
        } else {
          // Default: present (no user record or present=true)
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

    // Overall sick (from users, matched to students)
    const sickUsers = allUsers.filter(u => u.isSick);
    const sickStudentList = sickUsers
      .map(u => {
        const student = allStudents.find(s => s.admissionNumber === u.admissionNumber);
        if (!student) return null;
        return {
          id: student._id.toString(),
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          class: student.class || '',
          admissionNumber: student.admissionNumber || '',
          campus: (student.campus || '').toLowerCase(),
        };
      })
      .filter(Boolean);

    summary.totalSick = sickStudentList.length;
    summary.sickStudents = sickStudentList;

    return NextResponse.json(summary, {
      headers: addCacheHeaders({}, 'short'),
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
  }
}

// Mark a student absent/present for a specific meal
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { admissionNumber, meal, present, isSick } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json({ error: 'Admission number is required' }, { status: 400 });
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (meal) {
      updateFields[`attendance.${meal}.present`] = present ?? false;
    }

    if (typeof isSick === 'boolean') {
      updateFields.isSick = isSick;
    }

    await db.collection('users').updateOne(
      { admissionNumber },
      { $set: updateFields },
      { upsert: true }
    );

    // Save to attendance history
    if (meal) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.collection('attendance_history').updateOne(
        { admissionNumber, date: today },
        { $set: { [`meals.${meal}`]: present ?? false, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}

// Bulk update attendance
export async function PUT(request: Request) {
  try {
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
          updateFields[`attendance.${meal}.present`] = attendance[meal]?.present ?? true;
        }
      }
    }

    if (typeof isSick === 'boolean') {
      updateFields.isSick = isSick;
    }

    await db.collection('users').updateOne(
      { admissionNumber },
      { $set: updateFields },
      { upsert: true }
    );

    // Save to history
    if (attendance) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const meals: Record<string, boolean> = {};
      for (const meal of MEALS) {
        meals[meal] = attendance[meal]?.present ?? true;
      }
      await db.collection('attendance_history').updateOne(
        { admissionNumber, date: today },
        { $set: { meals, isSick: isSick || false, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
