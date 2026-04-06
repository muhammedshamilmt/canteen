import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the user's password
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'No user found with this email' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
} 