import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { admissionNumber, password } = body;

    if (!admissionNumber || !password) {
      return NextResponse.json({ error: 'Admission number and password are required' }, { status: 400 });
    }

    // Admin login — plain env var comparison
    if (
      admissionNumber === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json({
        user: {
          admissionNumber: process.env.ADMIN_EMAIL,
          email: process.env.ADMIN_EMAIL,
          fullName: 'Admin',
          role: 'admin',
          isLoggedIn: true,
        },
        message: 'Login successful',
      });
    }

    const client = await clientPromise;
    const db = client.db();

    // Try admission number first, then email
    const user = await db.collection('users').findOne({
      $or: [
        { admissionNumber: admissionNumber.trim() },
        { email: admissionNumber.trim() },
      ],
    });

    if (!user) {
      console.log(`[login] No user found for: ${admissionNumber}`);
      return NextResponse.json({ error: 'Invalid admission number or password' }, { status: 401 });
    }

    // Handle missing password field
    if (!user.password) {
      console.log(`[login] User ${admissionNumber} has no password set`);
      return NextResponse.json({ error: 'Account not set up — please contact admin' }, { status: 401 });
    }

    // Support bcrypt hashes and legacy plain-text
    let isValid = false;
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = user.password === password;
      if (isValid) {
        // Auto-upgrade to bcrypt
        const hashed = await bcrypt.hash(password, 10);
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { password: hashed } }
        );
      }
    }

    if (!isValid) {
      console.log(`[login] Wrong password for: ${admissionNumber}`);
      return NextResponse.json({ error: 'Invalid admission number or password' }, { status: 401 });
    }

    const { password: _pw, ...safeUser } = user;

    return NextResponse.json({
      user: { ...safeUser, _id: safeUser._id?.toString() },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('[login] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
