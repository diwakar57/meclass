import { createLogger } from '@/lib/logger';

const log = createLogger('EmailService');

export interface EmailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

interface EmailResult {
  success: boolean;
  provider: 'resend' | 'none';
  error?: string;
}

function normalizeRecipients(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'no-reply@learnai.study';

  if (!apiKey) {
    log.warn('RESEND_API_KEY not set; skipping outbound email', {
      to: payload.to,
      subject: payload.subject,
    });
    return { success: false, provider: 'none', error: 'Email provider not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: normalizeRecipients(payload.to),
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      log.error('Resend email request failed', {
        status: response.status,
        responseText,
        to: payload.to,
        subject: payload.subject,
      });
      return {
        success: false,
        provider: 'resend',
        error: `Provider error ${response.status}`,
      };
    }

    log.info('Transactional email sent', {
      to: payload.to,
      subject: payload.subject,
      provider: 'resend',
    });

    return { success: true, provider: 'resend' };
  } catch (error) {
    log.error('Email delivery error', error);
    return {
      success: false,
      provider: 'resend',
      error: 'Network or provider exception',
    };
  }
}
