import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI 

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function POST() {
  let client;
  try {
    const { client: mongoClient, db } = await connectToDatabase();
    client = mongoClient;
    
    // Generate new OTP
    const passkey = generateOTP();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Store in settings collection
    await db.collection('settings').updateOne(
      { type: 'passkey' },
      {
        $set: {
          passkey,
          expiresAt,
          createdAt: new Date(),
          isActive: true
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      passkey,
      expiresAt 
    });
  } catch (error) {
    console.error('Error generating passkey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate passkey' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function GET() {
  let client;
  try {
    const { client: mongoClient, db } = await connectToDatabase();
    client = mongoClient;
    
    const settings = await db.collection('settings').findOne({ type: 'passkey' });
    
    if (!settings) {
      return NextResponse.json({ 
        success: false, 
        error: 'No passkey found' 
      }, { status: 404 });
    }

    // Check if passkey is expired
    if (new Date() > new Date(settings.expiresAt)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Passkey expired' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      passkey: settings.passkey,
      expiresAt: settings.expiresAt,
      isActive: settings.isActive
    });
  } catch (error) {
    console.error('Error fetching passkey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch passkey' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
} 