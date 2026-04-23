import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { addCacheHeaders } from '@/lib/cache-headers';

type MealType = 'coffee' | 'breakfast' | 'lunch' | 'tea' | 'dinner';
const MEALS: MealType[] = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Fetch only needed fields
    const [allStudents, allUsers] = await Promise.all([
      db.collection('students')
        .find({}, { projection: { _id: 1, firstName: 1, lastName: 1, admissionNumber: 1, campus: 1, class: 1 } })
        .toArray(),
      db.collection('users')
        .find({}, { projection: { admissionNumber: 1, isSick: 1, attendance: 1 } })
        .toArray(),
    ]);

    const userMap = new Map(allUsers.map(u => [u.admissionNumber, u]));

    // Single pass over students — build all meal buckets at once
    const buckets: Record<MealType, { present: any[]; absent: any[]; sick: any[]; campusTotals: Record<string, number> }> = {
      coffee:    { present: [], absent: [], sick: [], campusTotals: {} },
      breakfast: { present: [], absent: [], sick: [], campusTotals: {} },
      lunch:     { present: [], absent: [], sick: [], campusTotals: {} },
      tea:       { present: [], absent: [], sick: [], campusTotals: {} },
      dinner:    { present: [], absent: [], sick: [], campusTotals: {} },
    };

    const sickStudentList: any[] = [];

    for (const student of allStudents) {
      const campus = (student.campus || 'unknown').toLowerCase();
      const user = userMap.get(student.admissionNumber);
      const info = {
        id: student._id.toString(),
        fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        class: student.class || '',
        admissionNumber: student.admissionNumber || '',
        campus,
      };

      if (user?.isSick) {
        sickStudentList.push(info);
        for (const meal of MEALS) buckets[meal].sick.push(info);
      } else {
        for (const meal of MEALS) {
          const b = buckets[meal];
          if (user?.attendance?.[meal]?.present === false) {
            b.absent.push(info);
          } else {
            b.present.push(info);
            b.campusTotals[campus] = (b.campusTotals[campus] || 0) + 1;
          }
        }
      }
    }

    const summary: Record<string, any> = {};
    for (const meal of MEALS) {
      const b = buckets[meal];
      summary[meal] = {
        total: allStudents.length,
        present: b.present.length,
        absent: b.absent.length,
        sick: b.sick.length,
        presentStudents: b.present,
        absentStudents: b.absent,
        sickStudents: b.sick,
        campusTotals: b.campusTotals,
      };
    }

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
