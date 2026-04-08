import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, fullName, email, password, admissionNumber } = await request.json();

    if (!admissionNumber || !password || !email) {
      return NextResponse.json({ error: 'Admission number, email and password are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [{ email: email.trim() }, { admissionNumber: admissionNumber.trim() }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email or admission number already exists' },
        { status: 400 }
      );
    }

    // Find student record
    const student = await db.collection('students').findOne({ admissionNumber: admissionNumber.trim() });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found with this admission number. Please contact admin.' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const resolvedFullName = fullName || `${firstName || ''} ${lastName || ''}`.trim();

    const newUser = {
      admissionNumber: admissionNumber.trim(),
      fullName: resolvedFullName,
      firstName: firstName || resolvedFullName.split(' ')[0] || '',
      lastName: lastName || resolvedFullName.split(' ').slice(1).join(' ') || '',
      email: email.trim(),
      password: hashedPassword,
      tableNumber: student.tableNumber || 1,
      role: 'student',
      class: student.class || '',
      campus: student.campus || '',
      isPresent: true,
      isSick: false,
      attendance: {
        coffee:    { present: true },
        breakfast: { present: true },
        lunch:     { present: true },
        tea:       { present: true },
        dinner:    { present: true },
      },
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);

    if (!result.acknowledged) {
      throw new Error('Failed to create user account');
    }

    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('[signup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create account' },
      { status: 500 }
    );
  }
}
