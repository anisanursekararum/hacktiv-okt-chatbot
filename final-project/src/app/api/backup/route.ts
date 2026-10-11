import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';
import { sendEmail } from '@/lib/email/smtp';

// GET: 1-click download of full JSON backup file
export async function GET() {
  const data = storage.exportFullBackup();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `omnia_backup_${dateStr}.json`;

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
    const { action, backupData } = body;

    // Action 1: Email backup dispatch
    if (action === 'email') {
      const user = storage.getUser();
      const fullBackup = storage.exportFullBackup();
      const jsonContent = JSON.stringify(fullBackup, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `omnia_backup_${dateStr}.json`;

      const result = await sendEmail({
        to: user.email,
        subject: `Omnia AI Backup Export - ${dateStr}`,
        text: `Hello ${user.full_name},\n\nAttached is your full Omnia AI database backup for ${dateStr}.\nYou can re-import this JSON anytime.\n\nOmnia AI Assistant`,
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
        message: result.success ? `Dispatched backup to ${user.email}` : result.error,
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
