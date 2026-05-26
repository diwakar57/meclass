import { createHmac, timingSafeEqual } from 'crypto';

interface StudentCertificateRecipient {
  firstName: string;
  lastName: string;
  email: string;
}

interface CertificateTokenPayload {
  certificateId: string;
  studentId: string;
  schoolId: string;
  issuedAtSeconds: number;
}

export interface VerifiedCertificateToken {
  isValid: boolean;
  certificateId: string;
  studentId: string;
  schoolId: string;
}

// 1 year
const CERTIFICATE_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;
const secret = process.env.CERTIFICATE_SECRET;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildSignature(payload: CertificateTokenPayload): string {
  if (!secret) {
    return '';
  }
  const signatureInput = `${payload.certificateId}:${payload.studentId}:${payload.schoolId}:${payload.issuedAtSeconds}`;
  return createHmac('sha256', secret).update(signatureInput).digest('hex');
}

function decodeTokenParts(token: string): string[] | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    return parts.length === 5 ? parts : null;
  } catch {
    return null;
  }
}

/**
 * Verify certificate token integrity and expiration.
 */
export function verifyCertificateToken(token: string): VerifiedCertificateToken {
  if (!token || !secret) {
    return { isValid: false, certificateId: '', studentId: '', schoolId: '' };
  }

  const parts = decodeTokenParts(token);
  if (!parts) {
    return { isValid: false, certificateId: '', studentId: '', schoolId: '' };
  }

  const [certificateId, studentId, schoolId, issuedAtRaw, signature] = parts;
  const issuedAtSeconds = Number(issuedAtRaw);

  if (!Number.isFinite(issuedAtSeconds)) {
    return { isValid: false, certificateId: '', studentId: '', schoolId: '' };
  }

  const expected = buildSignature({ certificateId, studentId, schoolId, issuedAtSeconds });
  const isSignatureValid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!isSignatureValid) {
    return { isValid: false, certificateId: '', studentId: '', schoolId: '' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - issuedAtSeconds > CERTIFICATE_TOKEN_TTL_SECONDS) {
    return { isValid: false, certificateId: '', studentId: '', schoolId: '' };
  }

  return { isValid: true, certificateId, studentId, schoolId };
}

/**
 * Render printable certificate HTML.
 */
export function renderCertificateHTML(
  certificate: { name: string; description?: string | null; template?: string | null },
  student: StudentCertificateRecipient,
  schoolName: string,
  token?: string
): string {
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const issuedDate = new Date().toLocaleDateString();
  const escapedCertificateName = escapeHtml(certificate.name);
  const escapedCertificateDescription = escapeHtml(certificate.description ?? '');
  const escapedStudentName = escapeHtml(studentName);
  const escapedStudentEmail = escapeHtml(student.email);
  const escapedSchoolName = escapeHtml(schoolName);
  const escapedIssuedDate = escapeHtml(issuedDate);
  const escapedToken = escapeHtml(token ?? '');

  const template = certificate.template ?? '';
  if (template.trim()) {
    return template
      .replaceAll('[CERTIFICATE_NAME]', escapedCertificateName)
      .replaceAll('[CERTIFICATE_DESCRIPTION]', escapedCertificateDescription)
      .replaceAll('[STUDENT_NAME]', escapedStudentName)
      .replaceAll('[STUDENT_EMAIL]', escapedStudentEmail)
      .replaceAll('[SCHOOL_NAME]', escapedSchoolName)
      .replaceAll('[ISSUED_DATE]', escapedIssuedDate)
      .replaceAll('[TOKEN]', escapedToken);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedCertificateName}</title>
  <style>
    body { margin: 0; padding: 40px; background: #f4f4f5; font-family: Georgia, serif; }
    .certificate { max-width: 960px; margin: 0 auto; background: #fff; border: 10px solid #d4af37; padding: 64px; text-align: center; }
    h1 { margin: 0 0 24px; color: #7a5b00; font-size: 48px; }
    .subtitle { color: #666; margin-bottom: 32px; }
    .name { font-size: 36px; font-weight: bold; margin: 24px 0; color: #1f2937; }
    .course { font-size: 28px; margin: 18px 0; color: #111827; }
    .meta { margin-top: 48px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>Certificate of Achievement</h1>
    <div class="subtitle">This certifies that</div>
    <div class="name">${escapedStudentName}</div>
    <div>has successfully completed</div>
    <div class="course">${escapedCertificateName}</div>
    <div>${escapedCertificateDescription}</div>
    <div class="meta">
      <div>Issued by ${escapedSchoolName}</div>
      <div>Date: ${escapedIssuedDate}</div>
      ${token ? `<div>Verification Token: ${escapedToken}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}
