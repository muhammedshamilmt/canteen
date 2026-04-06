import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Resend } from 'resend';

const resend = new Resend('re_hruVcDnR_4L7Kvv56jwSVxy4JeyDGnvoK');

// Function to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function POST(request: Request) {
  let client;
  try {
    // Validate request body
    if (!request.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { email } = await request.json();

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    try {
      // Connect to MongoDB
      client = await clientPromise;
      console.log('MongoDB connected successfully');
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const db = client.db();

    // Check if user exists with this email
    let user;
    try {
      user = await db.collection("users").findOne({ 
        $or: [
          { email: email.toLowerCase() },
          { email: email }
        ]
      });
      console.log('User search result:', user ? 'Found' : 'Not found');
    } catch (userError) {
      console.error('Error finding user:', userError);
      return NextResponse.json(
        { error: 'Error checking user account' },
        { status: 500 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Check for existing OTP
    try {
      const recentOTP = await db.collection("otpVerifications").findOne({
        email: email.toLowerCase(),
        expiresAt: { $gt: new Date() },
        used: false
      });

      if (recentOTP) {
        return NextResponse.json(
          { error: 'A verification code was already sent. Please wait a few minutes before requesting another one.' },
          { status: 429 }
        );
      }
    } catch (otpCheckError) {
      console.error('Error checking existing OTP:', otpCheckError);
      return NextResponse.json(
        { error: 'Error checking verification code status' },
        { status: 500 }
      );
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store OTP in verification collection
    try {
      const otpDoc = {
        email: email.toLowerCase(),
        otp,
        expiresAt,
        createdAt: new Date(),
        used: false
      };

      const result = await db.collection("otpVerifications").insertOne(otpDoc);
      console.log('OTP stored successfully:', result.insertedId);

      if (!result.insertedId) {
        throw new Error('Failed to store OTP');
      }
    } catch (otpStoreError) {
      console.error('Error storing OTP:', otpStoreError);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Send email using Resend
    try {
      const emailResult = await resend.emails.send({
        from: 'Canteen Tracker <onboarding@resend.dev>',
        to: email,
        subject: 'Password Reset Verification Code',
        html: `
          <h2>Password Reset Request</h2>
          <p>You have requested to reset your password. Use the following verification code to proceed:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px; color: #4F46E5;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        `
      });

      if (emailResult.error) {
        // If email fails, delete the stored OTP
        await db.collection("otpVerifications").deleteOne({ 
          email: email.toLowerCase(), 
          otp 
        });
        throw new Error('Failed to send email');
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully'
      });

    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Clean up OTP if email fails
      await db.collection("otpVerifications").deleteOne({ 
        email: email.toLowerCase(), 
        otp 
      });
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process password reset request' },
      { status: 500 }
    );
  }
} 