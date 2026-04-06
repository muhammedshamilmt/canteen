import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await request.json();
    
    const { admissionNumber, type, reason, startDate, endDate, notes } = body;

    if (!admissionNumber || !type || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add leave history entry
    await db.collection('leave_history').insertOne({
      admissionNumber,
      type: type || 'sick',
      reason: reason || 'Sick leave',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : new Date(startDate),
      notes: notes || '',
      createdAt: new Date()
    });

    // Update user sick status if it's a sick leave
    if (type === 'sick') {
      await db.collection('users').updateOne(
        { admissionNumber },
        { 
          $set: { 
            isSick: true,
            updatedAt: new Date()
          } 
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding leave history:', error);
    return NextResponse.json(
      { error: 'Failed to add leave history' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { searchParams } = new URL(request.url);
    const admissionNumber = searchParams.get('admissionNumber');

    if (!admissionNumber) {
      return NextResponse.json(
        { error: 'Admission number is required' },
        { status: 400 }
      );
    }

    const leaveHistory = await db.collection('leave_history')
      .find({ admissionNumber })
      .sort({ startDate: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(leaveHistory);
  } catch (error) {
    console.error('Error fetching leave history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave history' },
      { status: 500 }
    );
  }
}
