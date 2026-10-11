import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';

export async function GET() {
  const user = storage.getUser();
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      timezone: user.timezone,
    },
    googleClientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.includes('your-google')),
    googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, google_sub } = body;

    const user = storage.getUser();
    if (email) user.email = email;
    if (name) user.full_name = name;
    if (google_sub) user.google_sub = google_sub;

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
