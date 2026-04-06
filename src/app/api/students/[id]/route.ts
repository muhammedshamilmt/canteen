import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { id } = await params;

    // Find student by admission number or ObjectId
    let student;
    if (ObjectId.isValid(id)) {
      student = await db.collection('students').findOne({ _id: new ObjectId(id) });
    } else {
      student = await db.collection('students').findOne({ admissionNumber: id });
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get user data for attendance history
    const user = await db.collection('users').findOne({ 
      admissionNumber: student.admissionNumber 
    });

    // Get attendance history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceHistory = await db.collection('attendance_history')
      .find({ 
        admissionNumber: student.admissionNumber,
        date: { $gte: thirtyDaysAgo }
      })
      .sort({ date: -1 })
      .toArray();

    // Get sick/leave history
    const leaveHistory = await db.collection('leave_history')
      .find({ 
        admissionNumber: student.admissionNumber 
      })
      .sort({ startDate: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({
      student: {
        ...student,
        _id: student._id.toString(),
      },
      user,
      attendanceHistory,
      leaveHistory,
      stats: {
        totalDaysTracked: attendanceHistory.length,
        totalLeaves: leaveHistory.length,
        currentStatus: user?.isSick ? 'sick' : 'active',
      }
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { id } = await params;
    const updateData = await request.json();

    let result;
    if (ObjectId.isValid(id)) {
      result = await db.collection('students').updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
    } else {
      result = await db.collection('students').updateOne(
        { admissionNumber: id },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}
