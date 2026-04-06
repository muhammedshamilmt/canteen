import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface ImportStudent {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  phoneNumber?: string;
  class?: string;
  campus?: string;
  tableNumber?: number;
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { students }: { students: ImportStudent[] } = await request.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    }

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (const student of students) {
      if (!student.firstName) {
        results.errors.push(`Row ${results.inserted + results.skipped + 1}: missing firstName`);
        results.skipped++;
        continue;
      }

      const admNo = student.admissionNumber || student.phoneNumber || '';
      if (!admNo) {
        results.errors.push(`${student.firstName} ${student.lastName}: missing admission/phone number`);
        results.skipped++;
        continue;
      }

      const existing = await db.collection('students').findOne({ admissionNumber: admNo });
      if (existing) {
        results.skipped++;
        continue;
      }

      await db.collection('students').insertOne({
        firstName: student.firstName.trim(),
        lastName: student.lastName.trim(),
        admissionNumber: admNo.trim(),
        class: student.class?.trim() || '',
        campus: student.campus?.trim().toLowerCase() || 'dawa academy',
        tableNumber: Number(student.tableNumber) || 1,
        isPresent: true,
        attendance: {
          coffee: { present: true },
          breakfast: { present: true },
          lunch: { present: true },
          tea: { present: true },
          dinner: { present: true },
        },
        createdAt: new Date(),
      });

      results.inserted++;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
