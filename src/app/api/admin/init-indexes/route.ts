import { NextResponse } from 'next/server';
import { ensureIndexes } from '@/lib/db-indexes';

export async function POST() {
  try {
    await ensureIndexes();
    return NextResponse.json({ success: true, message: 'Indexes created' });
  } catch (error) {
    console.error('Index creation error:', error);
    return NextResponse.json({ error: 'Failed to create indexes' }, { status: 500 });
  }
}
