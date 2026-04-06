import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This endpoint seeds attendance history from current data
// Call it once to populate historical data
export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Get all users with their current attendance
    const users = await db.collection('users').find({}).toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create history entries for the last 30 days
    const historyEntries = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      for (const user of users) {
        // Simulate some variation in attendance
        const randomFactor = Math.random();
        
        historyEntries.push({
          admissionNumber: user.admissionNumber,
          date: date,
          meals: {
            coffee: randomFactor > 0.1 ? (user.attendance?.coffee?.present ?? true) : false,
            breakfast: randomFactor > 0.1 ? (user.attendance?.breakfast?.present ?? true) : false,
            lunch: randomFactor > 0.15 ? (user.attendance?.lunch?.present ?? true) : false,
            tea: randomFactor > 0.1 ? (user.attendance?.tea?.present ?? true) : false,
            dinner: randomFactor > 0.1 ? (user.attendance?.dinner?.present ?? true) : false,
          },
          isSick: randomFactor < 0.05, // 5% chance of being sick
          createdAt: date
        });
      }
    }

    // Insert all history entries
    if (historyEntries.length > 0) {
      await db.collection('attendance_history').insertMany(historyEntries);
    }

    // Create some sample leave history
    const leaveEntries = [];
    const sickUsers = users.filter(u => u.isSick);
    
    for (const user of sickUsers) {
      const daysAgo = Math.floor(Math.random() * 20);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1);

      leaveEntries.push({
        admissionNumber: user.admissionNumber,
        type: 'sick',
        reason: 'Medical leave',
        startDate,
        endDate,
        notes: 'Sick leave',
        createdAt: startDate
      });
    }

    if (leaveEntries.length > 0) {
      await db.collection('leave_history').insertMany(leaveEntries);
    }

    return NextResponse.json({ 
      success: true,
      attendanceRecords: historyEntries.length,
      leaveRecords: leaveEntries.length
    });
  } catch (error) {
    console.error('Error seeding history:', error);
    return NextResponse.json(
      { error: 'Failed to seed history' },
      { status: 500 }
    );
  }
}
