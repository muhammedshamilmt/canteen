import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DEFAULT_SETTINGS = {
  email: 'admin@example.com',
  allowPublicTableView: true,
  enableNotifications: true,
  darkMode: false,
  numberOfTables: 10,
  attendanceLockStart: '',
  attendanceLockEnd: '',
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const settings = await db.collection('settings').findOne({ key: 'global' });

    if (!settings) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const { _id, key, ...rest } = settings;
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...rest });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    // Strip password fields and internal fields
    const { currentPassword, newPassword, confirmPassword, _id, key, ...settingsToStore } = body;

    await db.collection('settings').updateOne(
      { key: 'global' },
      { $set: { key: 'global', ...settingsToStore } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();
    // TODO: implement password change
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
