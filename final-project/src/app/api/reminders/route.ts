import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';
import { sendEmail } from '@/lib/email/smtp';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const userId = email ? storage.getUser(email).id : undefined;
  const reminders = storage.getReminders(userId);
  return NextResponse.json({ reminders });
}

// POST: Trigger check and dispatch of due reminders (called manually or by external cron)
export async function POST(req: NextRequest) {
  try {
    let email = null;
    try {
      const body = await req.json();
      email = body.email;
    } catch (e) {}

    const reminders = storage.getReminders();
    const now = new Date();
    const results: any[] = [];

    for (const rem of reminders) {
      if (rem.status === 'SCHEDULED' && new Date(rem.trigger_time) <= now) {
        // Find owner of reminder
        const owner = storage.getUserById(rem.user_id) || (email ? storage.getUser(email) : storage.getUser());
        if (rem.channel === 'email') {
          const res = await sendEmail({
            to: owner.email,
            subject: `My PA Reminder: ${rem.payload}`,
            text: `Hi ${owner.full_name || 'there'},\n\nThis is your scheduled reminder from My PA:\n\n"${rem.payload}"\n\nScheduled for: ${new Date(rem.trigger_time).toLocaleString()}\nSent to: ${owner.email}\n\nMy PA Personal Assistant`,
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
