import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';
import { sendEmail } from '@/lib/email/smtp';

export async function GET() {
  const reminders = storage.getReminders();
  return NextResponse.json({ reminders });
}

// POST: Trigger check and dispatch of due reminders (called manually or by external cron)
export async function POST(req: NextRequest) {
  try {
    const user = storage.getUser();
    const reminders = storage.getReminders();
    const now = new Date();
    const results: any[] = [];

    for (const rem of reminders) {
      if (rem.status === 'SCHEDULED' && new Date(rem.trigger_time) <= now) {
        if (rem.channel === 'email') {
          const res = await sendEmail({
            to: user.email,
            subject: `Omnia Reminder: ${rem.payload}`,
            text: `Hi ${user.full_name},\n\nThis is your scheduled Omnia reminder:\n\n"${rem.payload}"\n\nScheduled for: ${rem.trigger_time}`,
          });

          if (res.success) {
            storage.updateReminder(rem.id, {
              status: 'SENT',
              sent_at: new Date().toISOString(),
              attempts: rem.attempts + 1,
            });
            results.push({ id: rem.id, status: 'SENT' });
          } else {
            storage.updateReminder(rem.id, {
              attempts: rem.attempts + 1,
              status: rem.attempts >= 2 ? 'FAILED' : 'SCHEDULED',
            });
            results.push({ id: rem.id, status: 'FAILED', error: res.error });
          }
        } else {
          // In-app reminder marked sent
          storage.updateReminder(rem.id, {
            status: 'SENT',
            sent_at: new Date().toISOString(),
            attempts: rem.attempts + 1,
          });
          results.push({ id: rem.id, status: 'SENT_IN_APP' });
        }
      }
    }

    return NextResponse.json({ processed: results.length, details: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
