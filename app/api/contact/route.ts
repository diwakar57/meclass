import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('Contact API');

export async function POST(request: NextRequest) {
  try {
    const { name, email, school, message, type } = await request.json();

    // Validation
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // TODO: In production, integrate with email service (SendGrid, Mailgun, etc.)
    // For now, just log the contact form submission
    log.info('Contact form submission', {
      name,
      email,
      school: school || 'Not provided',
      type,
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send email notification to admin@learnai.com
    // TODO: Send confirmation email to user

    return NextResponse.json(
      { message: 'Your message has been received. We will get back to you soon.' },
      { status: 200 }
    );
  } catch (error) {
    log.error('Contact form error', error);
    return NextResponse.json(
      { message: 'Failed to process contact form' },
      { status: 500 }
    );
  }
}
