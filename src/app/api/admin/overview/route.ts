import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { addCacheHeaders } from '@/lib/cache-headers';

const MEALS = ['coffee', 'breakfast', 'lunch', 'tea', 'dinner'] as const;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Total = students collection
    const allStudents = await db.collection('students').find({}).toArray();
    // Absence/sick = users collection
    const allUsers = await db.collection('users').find({}).toArray();
    const userMap = new Map(allUsers.map(u => [u.admissionNumber, u]));

    const students = allStudents.map(s => {
      const user = userMap.get(s.admissionNumber);
      const isSick = user?.isSick || false;
      const nextDay = user?.nextDayAttendance;

      return {
        _id: s._id.toString(),
        fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        admissionNumber: s.admissionNumber || '',
        class: s.class || '',
        campus: s.campus || '',
        tableNumber: s.tableNumber || '',
        isSick,
        attendance: Object.fromEntries(
          MEALS.map(meal => [
            meal,
            { present: isSick ? false : (user?.attendance?.[meal]?.present ?? true) },
          ])
        ),
        nextDayAttendance: nextDay
          ? {
              isSick: nextDay.isSick ?? isSick,
              ...Object.fromEntries(
                MEALS.map(meal => [
                  meal,
                  { present: (nextDay.isSick ?? isSick) ? false : (nextDay[meal]?.present ?? user?.attendance?.[meal]?.present ?? true) },
                ])
              ),
            }
          : undefined,
      };
    });

    // Class breakdown
    const classMap: Record<string, {
      total: number;
      meals: Record<string, number>;
      absent: Record<string, number>;
      sick: number;
    }> = {};

    for (const s of allStudents) {
      const cls = s.class || 'Unknown';
      if (!classMap[cls]) {
        classMap[cls] = { total: 0, meals: {}, absent: {}, sick: 0 };
        for (const meal of MEALS) {
          classMap[cls].meals[meal] = 0;
          classMap[cls].absent[meal] = 0;
        }
      }

      classMap[cls].total++;
      const user = userMap.get(s.admissionNumber);

      if (user?.isSick) {
        classMap[cls].sick++;
        for (const meal of MEALS) classMap[cls].absent[meal]++;
      } else {
        for (const meal of MEALS) {
          const isPresent = user?.attendance?.[meal]?.present ?? true;
          if (isPresent) classMap[cls].meals[meal]++;
          else classMap[cls].absent[meal]++;
        }
      }
    }

    const classBreakdown = Object.entries(classMap)
      .map(([cls, data]) => ({ class: cls, ...data }))
      .sort((a, b) => a.class.localeCompare(b.class));

    return NextResponse.json({ students, classBreakdown }, {
      headers: addCacheHeaders({}, 'short'),
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}
