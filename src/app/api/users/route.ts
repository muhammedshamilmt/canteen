import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { addCacheHeaders } from '@/lib/cache-headers';

interface Attendance {
  present: boolean;
  sick?: boolean;
  sickReason?: string;
}

interface User {
  admissionNumber: string;
  fullName: string;
  email: string;
  role: string;
  class: string;
  attendance: {
    coffee: Attendance;
    breakfast: Attendance;
    lunch: Attendance;
    tea: Attendance;
    dinner: Attendance;
  };
}

// Default attendance object
const defaultAttendance = {
  coffee: { present: true, sick: false, sickReason: '' },
  breakfast: { present: true, sick: false, sickReason: '' },
  lunch: { present: true, sick: false, sickReason: '' },
  tea: { present: true, sick: false, sickReason: '' },
  dinner: { present: true, sick: false, sickReason: '' }
};

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { admissionNumber, fullName, email, password, campus } = await request.json();

    // First check if the admission number exists in students collection
    const student = await db.collection("students").findOne({ admissionNumber });
    
    if (!student) {
      return NextResponse.json(
        { error: 'Admission number not found in student records' },
        { status: 400 }
      );
    }

    // Check if user already exists with this admission number
    const existingUser = await db.collection("users").findOne({ admissionNumber });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this admission number' },
        { status: 400 }
      );
    }

    // Check if email is already in use
    const existingEmail = await db.collection("users").findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 400 }
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with attendance data and class from student record
    const newUser = {
      admissionNumber,
      fullName,
      email,
      password: hashedPassword,
      role: 'student',
      class: student.class,
      campus: campus || student.campus || 'Main',
      attendance: defaultAttendance, // Set all attendance to true by default
      isPresent: true, // Set overall presence to true
      createdAt: new Date()
    };

    const result = await db.collection("users").insertOne(newUser);
    
    // Also update the student record to sync attendance and campus
    await db.collection("students").updateOne(
      { admissionNumber },
      { 
        $set: { 
          attendance: defaultAttendance,
          isPresent: true,
          campus: campus || student.campus || 'Main'
        }
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user account' },
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

    // If admissionNumber is provided, return specific user
    if (admissionNumber) {
      const user = await db.collection("users").findOne({ admissionNumber });
      return NextResponse.json(user, {
        headers: addCacheHeaders({}, 'short')
      });
    }

    // Otherwise, return all users
    const users = await db.collection("users").find({}).toArray();
    return NextResponse.json(users, {
      headers: addCacheHeaders({}, 'short')
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { admissionNumber, attendance, isSick, campus } = await request.json();

    if (!admissionNumber) {
      return NextResponse.json(
        { error: 'Admission number is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const updateData: any = {};

    // Update attendance if provided
    if (attendance) {
      updateData.attendance = attendance;
    }

    // Update sick status if provided
    if (typeof isSick === 'boolean') {
      updateData.isSick = isSick;
    }

    // Update campus if provided
    if (campus) {
      updateData.campus = campus;
    }

    // Update both users and students collections
    const [userResult, studentResult] = await Promise.all([
      db.collection('users').updateOne(
        { admissionNumber },
        { $set: updateData }
      ),
      db.collection('students').updateOne(
        { admissionNumber },
        { $set: updateData }
      )
    ]);

    if (userResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Save to attendance history if attendance was updated
    if (attendance) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await db.collection('attendance_history').updateOne(
        { 
          admissionNumber,
          date: today
        },
        {
          $set: {
            admissionNumber,
            date: today,
            meals: {
              coffee: attendance?.coffee?.present || false,
              breakfast: attendance?.breakfast?.present || false,
              lunch: attendance?.lunch?.present || false,
              tea: attendance?.tea?.present || false,
              dinner: attendance?.dinner?.present || false,
            },
            isSick: isSick || false,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
} 