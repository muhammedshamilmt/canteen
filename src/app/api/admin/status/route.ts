import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json({ isAdmin: false });
    }

    const user = JSON.parse(userCookie.value);
    return NextResponse.json({ isAdmin: user.role === 'admin' });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
} 