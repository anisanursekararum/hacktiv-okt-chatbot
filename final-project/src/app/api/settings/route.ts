import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';

export async function GET() {
  const settings = storage.getSettings();
  const user = storage.getUser();
  return NextResponse.json({ settings, user });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = storage.updateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
