import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { lmsPhase2Service } from '@/lib/services/lms-phase2-service';

const ALLOWED_ROLES = [
  'teacher',
  'student',
  'parent',
  'principal',
  'school_admin',
  'accountant',
  'supervisor',
] as const;

export const GET = withRole([...ALLOWED_ROLES], async (_request: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const data = await lmsPhase2Service.listCommunications(auth);
  return NextResponse.json({ success: true, data });
});

export const POST = withRole([...ALLOWED_ROLES], async (request: NextRequest, auth: AuthContext) => {
  if (!auth.schoolId) {
    return NextResponse.json({ success: false, error: 'Missing school scope' }, { status: 401 });
  }

  const body = await request.json();
  const recipient = typeof body?.recipient === 'string' ? body.recipient.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : undefined;
  const messageBody = typeof body?.body === 'string' ? body.body.trim() : '';

  if (!recipient || !messageBody) {
    return NextResponse.json(
      { success: false, error: 'recipient and body are required' },
      { status: 400 }
    );
  }

  const sent = await lmsPhase2Service.sendMessage({
    schoolId: auth.schoolId,
    senderId: auth.userId,
    recipient,
    subject,
    body: messageBody,
  });

  return NextResponse.json({
    success: true,
    message: 'Message sent successfully',
    messageId: sent.messageId,
    recipientId: sent.recipientId,
    recipientName: sent.recipientName,
    status: sent.status,
  });
});
