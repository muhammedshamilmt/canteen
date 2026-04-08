import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// PATCH: toggle a single meal in attendance_history
export async function PATCH(request: Request) {
  try {
    const { admissionNumber, date, meal, present } = await request.json();

    if (!admissionNumber || !date || !meal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);

    await db.collection('attendance_history').updateOne(
      { admissionNumber, date: recordDate },
      { $set: { [`meals.${meal}`]: present, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance history:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
