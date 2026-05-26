import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthContext } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { appendRequestAuditLog } from '@/lib/services/audit-service';

let stripeClient: Stripe | null = null;

interface InvoiceItem {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  dueDate?: string | null;
  pdf?: string | null;
}

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is not configured. Please set it in your environment or .env file.'
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function success(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

async function getSchoolBillingInfo(schoolId: string) {
  const school = await db.query(
    `SELECT
       id,
       subscription_tier,
       stripe_customer_id,
       monthly_price,
       student_limit,
       next_billing_date,
       subscription_status
     FROM schools
     WHERE id = $1`,
    [schoolId]
  );

  return school.rows[0] as
    | {
        id: string;
        subscription_tier?: string | null;
        stripe_customer_id?: string | null;
        monthly_price?: number | null;
        student_limit?: number | null;
        next_billing_date?: string | Date | null;
        subscription_status?: string | null;
      }
    | undefined;
}

async function getInvoiceRows(schoolId: string): Promise<InvoiceItem[]> {
  try {
    const result = await db.query(
      `SELECT id, invoice_number, amount, status, created_at, due_date, pdf_url
       FROM invoices
       WHERE school_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [schoolId]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id || ''),
      number: String(row.invoice_number || row.id || ''),
      date: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
      amount: Number(row.amount || 0),
      status: String(row.status || 'pending'),
      dueDate: row.due_date ? new Date(String(row.due_date)).toISOString() : null,
      pdf: row.pdf_url ? String(row.pdf_url) : null,
    }));
  } catch (error) {
    logger.warn('Invoices table not available for billing overview', { schoolId, error });
    return [];
  }
}

function buildBillingHistory(invoices: InvoiceItem[]): Array<{ month: string; amount: number; status: string }> {
  const byMonth = new Map<string, { amount: number; paidCount: number; totalCount: number }>();

  for (const invoice of invoices) {
    const month = new Date(invoice.date).toLocaleString('en-US', { month: 'short' });
    const current = byMonth.get(month) || { amount: 0, paidCount: 0, totalCount: 0 };
    current.amount += Number(invoice.amount || 0);
    current.totalCount += 1;
    if (String(invoice.status).toLowerCase() === 'paid') {
      current.paidCount += 1;
    }
    byMonth.set(month, current);
  }

  return Array.from(byMonth.entries())
    .map(([month, row]) => ({
      month,
      amount: Number(row.amount.toFixed(2)),
      status: row.paidCount === row.totalCount ? 'paid' : row.paidCount > 0 ? 'partial' : 'pending',
    }))
    .slice(0, 12)
    .reverse();
}

async function getPrimaryPaymentMethod(stripeCustomerId?: string | null) {
  if (!stripeCustomerId) {
    return null;
  }

  try {
    const paymentMethods = await getStripe().paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 1,
    });

    const method = paymentMethods.data[0];
    if (!method || !method.card) {
      return null;
    }

    return {
      type: 'card',
      last4: method.card.last4,
    };
  } catch (error) {
    logger.warn('Failed to fetch primary payment method', { stripeCustomerId, error });
    return null;
  }
}

// GET /api/billing - Billing dashboard aggregate for school admins/principals/accountants
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const school = await getSchoolBillingInfo(authContext.schoolId);
    if (!school) {
      return failure('School not found', 404);
    }

    const studentUsageResult = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE school_id = $1
         AND role = 'student'
         AND is_active = true`,
      [authContext.schoolId]
    );
    const studentUsage = Number(studentUsageResult.rows[0]?.count || 0);

    const invoices = await getInvoiceRows(authContext.schoolId);
    const paymentMethod = await getPrimaryPaymentMethod(school.stripe_customer_id || null);
    const billingHistory = buildBillingHistory(invoices);

    const normalizedData = {
      currentPlan: school.subscription_tier || 'basic',
      studentLimit: Number(school.student_limit || 100),
      studentUsage,
      monthlyRate: Number(school.monthly_price || 0),
      nextBillingDate: school.next_billing_date
        ? new Date(String(school.next_billing_date)).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      billingHistory,
      paymentMethod,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        date: invoice.date,
        amount: invoice.amount,
        status: invoice.status,
      })),
      subscriptionStatus: school.subscription_status || 'active',
    };

    return success(normalizedData);
  } catch (error) {
    logger.error('GET /api/billing failed', { error });
    return failure('Internal server error', 500);
  }
}

// GET /api/billing/plan - Get current subscription plan details
export async function GET_plan(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const school = await getSchoolBillingInfo(authContext.schoolId);
    if (!school) {
      return failure('School not found', 404);
    }

    return success({
      planName: school.subscription_tier || 'basic',
      monthlyPrice: Number(school.monthly_price || 0),
      studentLimit: Number(school.student_limit || 100),
      renewalDate: school.next_billing_date
        ? new Date(String(school.next_billing_date)).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: school.subscription_status || 'active',
    });
  } catch (error) {
    logger.error('GET /api/billing/plan failed', { error });
    return failure('Internal server error', 500);
  }
}

// GET /api/billing/invoices - Get invoice history
export async function GET_invoices(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const invoices = await getInvoiceRows(authContext.schoolId);
    return success({ invoices });
  } catch (error) {
    logger.error('Failed to fetch invoices', { error });
    return failure('Internal server error', 500);
  }
}

// POST /api/billing/create-checkout-session - Create Stripe checkout
export async function POST_checkout(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const body = await request.json().catch(() => ({}));
    const planId = String(body?.planId || '').trim();
    if (!planId) {
      return failure('Missing planId', 400);
    }

    const school = await db.query(
      'SELECT id, name, email, stripe_customer_id FROM schools WHERE id = $1',
      [authContext.schoolId]
    );

    if (school.rows.length === 0) {
      return failure('School not found', 404);
    }

    const schoolData = school.rows[0] as Record<string, unknown>;
    let customerId = schoolData.stripe_customer_id ? String(schoolData.stripe_customer_id) : null;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        ...(schoolData.email ? { email: String(schoolData.email) } : {}),
        ...(schoolData.name ? { name: String(schoolData.name) } : {}),
        metadata: { schoolId: authContext.schoolId },
      });
      customerId = customer.id;

      await db.query('UPDATE schools SET stripe_customer_id = $1 WHERE id = $2', [
        customerId,
        authContext.schoolId,
      ]);
    }

    const priceId = process.env[`STRIPE_PRICE_${planId.toUpperCase()}`];
    if (!priceId) {
      return failure('Invalid plan configuration', 400);
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/billing`,
      metadata: { schoolId: authContext.schoolId, requestedBy: authContext.userId },
    });

    await appendRequestAuditLog(request, {
      schoolId: authContext.schoolId,
      userId: authContext.userId,
      action: 'billing_checkout_session_created',
      resourceType: 'school_subscription',
      resourceId: authContext.schoolId,
      changes: { planId, stripeSessionId: session.id },
    });

    return success({ sessionId: session.id });
  } catch (error) {
    logger.error('Failed to create checkout session', { error });
    return failure('Internal server error', 500);
  }
}

// GET /api/billing/payment-methods - Get saved payment methods
export async function GET_payment_methods(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext?.schoolId) {
      return failure('Unauthorized', 401);
    }

    const school = await db.query('SELECT stripe_customer_id FROM schools WHERE id = $1', [
      authContext.schoolId,
    ]);

    if (school.rows.length === 0 || !school.rows[0].stripe_customer_id) {
      return success({ paymentMethods: [] });
    }

    const paymentMethods = await getStripe().paymentMethods.list({
      customer: school.rows[0].stripe_customer_id,
      type: 'card',
    });

    const methods = paymentMethods.data.map((method: any) => ({
      id: method.id,
      type: 'credit_card',
      last4: method.card.last4,
      expiry: `${method.card.exp_month}/${method.card.exp_year}`,
      isDefault: method.id === paymentMethods.data[0]?.id,
    }));

    return success({ paymentMethods: methods });
  } catch (error) {
    logger.error('Failed to fetch payment methods', { error });
    return failure('Internal server error', 500);
  }
}

// POST /api/billing/webhooks - Handle Stripe webhooks
export async function POST_webhook(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  try {
    const event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'invoice.paid': {
        const paidInvoice = event.data.object as any;
        const schoolId = paidInvoice.metadata?.schoolId;

        if (schoolId) {
          await db.query(
            `INSERT INTO invoices (
               school_id, invoice_number, amount, status, created_at, due_date, paid_date, stripe_invoice_id
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (invoice_number) DO UPDATE
             SET status = EXCLUDED.status,
                 paid_date = EXCLUDED.paid_date,
                 stripe_invoice_id = EXCLUDED.stripe_invoice_id`,
            [
              schoolId,
              paidInvoice.number || paidInvoice.id,
              Number(paidInvoice.amount_paid || 0) / 100,
              'paid',
              new Date((paidInvoice.created || Date.now() / 1000) * 1000),
              paidInvoice.due_date ? new Date(paidInvoice.due_date * 1000) : null,
              new Date(),
              paidInvoice.id || null,
            ]
          );

          logger.info('Invoice paid webhook processed', { invoiceId: paidInvoice.id, schoolId });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as any;
        const schoolId = failedInvoice.metadata?.schoolId;
        if (schoolId) {
          await db.query(
            `INSERT INTO invoices (
               school_id, invoice_number, amount, status, created_at, due_date, stripe_invoice_id
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (invoice_number) DO UPDATE
             SET status = EXCLUDED.status,
                 stripe_invoice_id = EXCLUDED.stripe_invoice_id`,
            [
              schoolId,
              failedInvoice.number || failedInvoice.id,
              Number(failedInvoice.amount_due || 0) / 100,
              'overdue',
              new Date((failedInvoice.created || Date.now() / 1000) * 1000),
              failedInvoice.due_date ? new Date(failedInvoice.due_date * 1000) : null,
              failedInvoice.id || null,
            ]
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const schoolId = subscription.metadata?.schoolId;
        if (schoolId) {
          await db.query(
            `UPDATE schools
             SET subscription_status = 'cancelled',
                 status = CASE WHEN status = 'active' THEN 'suspended' ELSE status END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [schoolId]
          );
        }
        break;
      }
      default:
        break;
    }

    return success({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', { error });
    return failure('Webhook processing failed', 400);
  }
}
