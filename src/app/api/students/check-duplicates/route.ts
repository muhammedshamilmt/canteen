import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { admissionNumbers }: { admissionNumbers: string[] } = await request.json();

    if (!Array.isArray(admissionNumbers) || admissionNumbers.length === 0) {
      return NextResponse.json({ existing: [] });
    }

    const client = await clientPromise;
    const db = client.db();

    const existing = await db
      .collection('students')
      .find({ admissionNumber: { $in: admissionNumbers } }, { projection: { admissionNumber: 1 } })
      .toArray();

    return NextResponse.json({
      existing: existing.map(s => s.admissionNumber),
    });
  } catch (error) {
    console.error('Check duplicates error:', error);
    return NextResponse.json({ existing: [] }, { status: 500 });
  }
}
