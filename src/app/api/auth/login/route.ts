import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const db = await connectToDatabase();
    const { admissionNumber, password } = await request.json();

    // Check if it's an admin login
    if (
      admissionNumber === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json({
        success: true,
        user: {
          email: admissionNumber,
          role: 'admin',
          isLoggedIn: true
        }
      });
    }

    // Find user by admission number
    const user = await db.collection("users").findOne({ admissionNumber });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid admission number or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid admission number or password' },
        { status: 401 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    const message = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Login failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}