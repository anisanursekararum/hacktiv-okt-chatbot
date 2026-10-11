import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || 'anisa.arum.work@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || `"Omnia AI Assistant" <${SMTP_USER}>`;

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // If no password configured (dev/mock environment), log to console and simulate successful send
  if (!SMTP_PASS) {
    console.log(`[SMTP DEV MODE] Email simulated to: ${options.to}`);
    console.log(`[SMTP DEV MODE] Subject: ${options.subject}`);
    console.log(`[SMTP DEV MODE] Body preview: ${options.text.slice(0, 150)}...`);
    if (options.attachments?.length) {
      console.log(`[SMTP DEV MODE] Attached: ${options.attachments.map((a) => a.filename).join(', ')}`);
    }
    return {
      success: true,
      messageId: `mock_${Date.now()}_dev`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${options.text.replace(/\n/g, '<br/>')}</div>`,
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error('SMTP send error:', err);
    return {
      success: false,
      error: err.message || 'Failed to dispatch email',
    };
  }
}
