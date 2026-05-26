import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { query } from '@/lib/db';
import { nanoid } from 'nanoid';
import { sendTransactionalEmail } from '@/lib/utils/email';
import { isDevAuthFallbackEnabled } from '@/lib/auth/dev-fallback';

const log = createLogger('School Registration API');

function generateDomainFromSchoolName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${cleaned || 'school'}.learnai.school`;
}

function getSchoolCodeFromId(id: string): string {
  return `SCH-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  let schoolName = '';
  let country = '';
  let principalFirstName = '';
  let principalLastName = '';
  let principalEmail = '';
  let schoolType = '';
  let studentCount = '';

  const schoolId = nanoid();
  let generatedDomain = 'school.learnai.school';

  try {
    const body = await request.json();
    schoolName = body.schoolName || '';
    country = body.country || '';
    const state = body.state;
    const city = body.city;
    principalFirstName = body.principalFirstName || '';
    principalLastName = body.principalLastName || '';
    principalEmail = body.principalEmail || '';
    schoolType = body.schoolType || '';
    studentCount = body.studentCount || '';
    const website = body.website;

    // Validation
    if (!schoolName?.trim() || !principalEmail?.trim() || !country?.trim()) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(principalEmail)) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    generatedDomain = generateDomainFromSchoolName(schoolName);

    // Build insert dynamically so this route is compatible with schema variants.
    const columnResult = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'schools'`
    );
    const schoolColumns = new Set<string>(
      columnResult.rows.map((r: any) => r.column_name)
    );

    const cols: string[] = [];
    const values: unknown[] = [];

    const pushIf = (column: string, value: unknown) => {
      if (schoolColumns.has(column)) {
        cols.push(column);
        values.push(value);
      }
    };

    pushIf('id', schoolId);
    pushIf('name', schoolName.trim());
    pushIf('domain', generatedDomain);
    pushIf('status', 'pending');
    pushIf('city', city?.trim() || null);
    pushIf('state', state?.trim() || null);
    pushIf('country', country?.trim() || null);
    pushIf('website', website?.trim() || null);
    pushIf('description', `${schoolType || 'School'} registration (${studentCount || 'unknown size'})`);

    if (cols.length > 0) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await query(
        `INSERT INTO schools (${cols.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }

    // Create a pending principal account (inactive until approval) where supported.
    const userColumnResult = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'users'`
    );
    const userColumns = new Set<string>(
      userColumnResult.rows.map((r: any) => r.column_name)
    );

    if (userColumns.has('email') && userColumns.has('role')) {
      const existingPrincipal = await query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [principalEmail.trim()]
      );

      if (existingPrincipal.rows.length === 0) {
        const uCols: string[] = [];
        const uValues: unknown[] = [];
        const pushUserIf = (column: string, value: unknown) => {
          if (userColumns.has(column)) {
            uCols.push(column);
            uValues.push(value);
          }
        };

        pushUserIf('id', nanoid());
        pushUserIf('email', principalEmail.trim());
        pushUserIf('password_hash', 'pending_activation');
        pushUserIf('role', 'principal');
        pushUserIf('school_id', schoolId);
        pushUserIf('first_name', principalFirstName?.trim() || 'Principal');
        pushUserIf('last_name', principalLastName?.trim() || 'User');
        pushUserIf('is_active', false);
        pushUserIf('email_verified', false);

        if (uCols.length > 0) {
          const uPlaceholders = uCols.map((_, i) => `$${i + 1}`).join(', ');
          await query(`INSERT INTO users (${uCols.join(', ')}) VALUES (${uPlaceholders})`, uValues);
        }
      }
    }

    const schoolCode = getSchoolCodeFromId(schoolId);

    log.info('School registration submission', {
      schoolId,
      schoolCode,
      schoolName,
      country,
      principalName: `${principalFirstName} ${principalLastName}`,
      principalEmail,
      schoolType,
      studentCount,
      timestamp: new Date().toISOString(),
    });

    const principalFullName = `${principalFirstName || ''} ${principalLastName || ''}`.trim();
    await sendTransactionalEmail({
      to: principalEmail.trim(),
      subject: `Your LearnAI school workspace is ready: ${schoolName}`,
      text: `Hello ${principalFullName || 'Principal'},\n\nYour school registration has been received.\n\nSchool: ${schoolName}\nInvite Code: ${schoolCode}\nDomain: ${generatedDomain}\n\nUse this invite code for principal/teacher onboarding and keep it secure.\n\nDesigned and operated by LearnAI.study`,
      html: `<p>Hello ${principalFullName || 'Principal'},</p><p>Your school registration has been received.</p><p><strong>School:</strong> ${schoolName}<br/><strong>Invite Code:</strong> ${schoolCode}<br/><strong>Domain:</strong> ${generatedDomain}</p><p>Use this invite code for principal/teacher onboarding and keep it secure.</p><p>Designed and operated by LearnAI.study</p>`,
    });

    const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL;
    if (platformAdminEmail) {
      await sendTransactionalEmail({
        to: platformAdminEmail,
        subject: `New school registration: ${schoolName}`,
        text: `A new school registration was submitted.\n\nSchool: ${schoolName}\nSchool ID: ${schoolId}\nInvite Code: ${schoolCode}\nPrincipal: ${principalFullName || 'N/A'}\nPrincipal Email: ${principalEmail}\nCountry: ${country}\n\nDesigned and operated by LearnAI.study`,
      });
    }

    return NextResponse.json(
      {
        message: 'School registration submitted successfully. Check your email for next steps.',
        schoolId,
        schoolCode,
        schoolDomain: generatedDomain,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('School registration error', error);

    // In development fallback mode, keep UI flow unblocked for frontend testing.
    if (isDevAuthFallbackEnabled()) {
      const schoolCode = getSchoolCodeFromId(schoolId);
      return NextResponse.json(
        {
          message: 'School registration saved in development fallback mode. Start PostgreSQL for persistent storage.',
          schoolId,
          schoolCode,
          schoolDomain: generatedDomain,
          warning: 'Development fallback active; no persistent record was written.',
        },
        { status: 202 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    const err = error as any;
    const errorCode = err?.code || err?.cause?.code;
    const isDbDown =
      errorCode === 'ECONNREFUSED' ||
      message.includes('ECONNREFUSED') ||
      message.includes('connect ECONNREFUSED');

    return NextResponse.json(
      {
        message: isDbDown
          ? 'Database unavailable. Please configure and start PostgreSQL, then retry school registration.'
          : 'Failed to process school registration',
      },
      { status: isDbDown ? 503 : 500 }
    );
  }
}
