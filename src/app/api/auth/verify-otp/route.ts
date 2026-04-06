import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();

    // Find the OTP document
    const otpDoc = await db.collection('otpVerifications').findOne({
      email: email.toLowerCase(),
      otp,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Mark OTP as used
    await db.collection('otpVerifications').updateOne(
      { _id: otpDoc._id },
      { $set: { used: true } }
    );

    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
} 