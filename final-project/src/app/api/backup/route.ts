import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';
import { sendEmail } from '@/lib/email/smtp';

// GET: 1-click download of full JSON backup file
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const userId = email ? storage.getUser(email).id : undefined;

  const data = storage.exportFullBackup(userId);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `my_pa_backup_${dateStr}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// POST: Restore import or trigger SMTP email backup dispatch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, backupData, recipientEmail } = body;

    // Action 1: Email backup dispatch
    if (action === 'email') {
      const targetEmail = recipientEmail || storage.getUser().email;
      const user = storage.getUser(targetEmail);
      const fullBackup = storage.exportFullBackup(user.id);
      const jsonContent = JSON.stringify(fullBackup, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `my_pa_backup_${dateStr}.json`;

      const result = await sendEmail({
        to: targetEmail,
        subject: `My PA Database Backup - ${dateStr}`,
        text: `Hello ${user.full_name || 'User'},\n\nAttached is your full My PA database backup for ${dateStr}.\nSent to registered recipient: ${targetEmail}\nYou can re-import this JSON file anytime in your Settings tab.\n\nBest regards,\nMy PA Assistant`,
        attachments: [
          {
            filename,
            content: jsonContent,
            contentType: 'application/json',
          },
        ],
      });

      return NextResponse.json({
        success: result.success,
        message: result.success ? `Dispatched backup to ${targetEmail}` : result.error,
      });
    }

    // Action 2: Import JSON backup
    if (action === 'import' && backupData) {
      const result = storage.importBackup(backupData);
      return NextResponse.json({
        success: true,
        stats: result.imported,
        message: 'Backup imported successfully without duplicates',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
