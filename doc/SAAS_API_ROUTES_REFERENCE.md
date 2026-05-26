// ============================================================================
// SAAS API ROUTES - Complete Reference Implementation
// ============================================================================
// Copy these route implementations to your app/api/admin/* directory
// ============================================================================

// ============================================================================
// 1. TENANT MANAGEMENT APIS
// ============================================================================

// app/api/admin/tenants/route.ts - Create & List Tenants
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/auth-service';
import { tenantService, auditService } from '@/lib/services/saas-core-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    // Only SAAS_ADMIN can create tenants
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, countryCode } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Create tenant
    const school = await tenantService.createTenant({
      name,
      email,
      countryCode: countryCode || 'US',
    });

    // Audit log
    await auditService.logAction({
      schoolId: school.id,
      action: 'create_school',
      actionCategory: 'TENANT_MANAGEMENT',
      targetType: 'School',
      targetId: school.id,
      targetName: school.name,
      actorId: user.id,
      actorEmail: user.email,
      changesSummary: `Created new school: ${school.name}`,
      ipAddress: req.ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: school,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/admin/tenants error:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const tier = url.searchParams.get('tier');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '50');

    const tenants = await tenantService.listTenants({
      status: status || undefined,
      tier: tier || undefined,
      skip,
      take,
    });

    return NextResponse.json({
      success: true,
      data: tenants,
    });
  } catch (error) {
    logger.error('GET /api/admin/tenants error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 2. TENANT DETAILS & CONFIGURATION
// ============================================================================

// app/api/admin/tenants/[id]/route.ts
export async function GET_TENANT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const tenant = await tenantService.getTenant(params.id);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    logger.error('GET /api/admin/tenants/[id] error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function PUT_TENANT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Config object required' },
        { status: 400 }
      );
    }

    const updated = await tenantService.updateTenantConfig(params.id, config);

    await auditService.logAction({
      schoolId: params.id,
      action: 'update_school_config',
      actionCategory: 'TENANT_MANAGEMENT',
      targetType: 'SchoolConfig',
      actorId: user.id,
      changesSummary: `Updated school configuration`,
      ipAddress: req.ip,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('PUT /api/admin/tenants/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE_TENANT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await tenantService.deleteTenant(params.id);

    await auditService.logAction({
      schoolId: params.id,
      action: 'delete_school',
      actionCategory: 'TENANT_MANAGEMENT',
      targetType: 'School',
      targetId: params.id,
      actorId: user.id,
      changesSummary: `Deleted school tenant`,
      ipAddress: req.ip,
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant deleted',
    });
  } catch (error) {
    logger.error('DELETE /api/admin/tenants/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 3. TENANT METRICS & ANALYTICS
// ============================================================================

// app/api/admin/tenants/[id]/metrics/route.ts
export async function GET_TENANT_METRICS(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const metrics = await tenantService.getTenantMetrics(params.id);

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('GET /api/admin/tenants/[id]/metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 4. SUBSCRIPTION MANAGEMENT
// ============================================================================

// app/api/admin/subscriptions/route.ts
export async function POST_SUBSCRIPTION(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { schoolId, tier } = body;

    if (!schoolId || !tier) {
      return NextResponse.json(
        { error: 'schoolId and tier required' },
        { status: 400 }
      );
    }

    const { billingService } = await import(
      '@/lib/services/saas-core-service'
    );
    const subscription = await billingService.createSubscription(
      schoolId,
      tier
    );

    await auditService.logAction({
      schoolId,
      action: 'create_subscription',
      actionCategory: 'SUBSCRIPTION',
      targetType: 'Subscription',
      targetId: subscription.id,
      actorId: user.id,
      changesSummary: `Created ${tier} subscription`,
      ipAddress: req.ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: subscription,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/admin/subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 5. BILLING & INVOICES
// ============================================================================

// app/api/admin/billing/invoices/route.ts - Generate Invoice
export async function POST_INVOICE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId required' },
        { status: 400 }
      );
    }

    const { billingService } = await import(
      '@/lib/services/saas-core-service'
    );
    const invoice = await billingService.generateInvoice(subscriptionId);

    await auditService.logAction({
      schoolId: invoice.schoolId,
      action: 'generate_invoice',
      actionCategory: 'BILLING',
      targetType: 'Invoice',
      targetId: invoice.id,
      actorId: user.id,
      changesSummary: `Generated invoice ${invoice.invoiceNumber}`,
      ipAddress: req.ip,
    });

    return NextResponse.json(
      {
        success: true,
        data: invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/admin/billing/invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 6. AUDIT LOGS
// ============================================================================

// app/api/admin/audit-logs/route.ts - Platform Audit Logs
export async function GET_AUDIT_LOGS(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SAAS_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(req.url);
    const schoolId = url.searchParams.get('schoolId');
    const action = url.searchParams.get('action');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '100');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId required' },
        { status: 400 }
      );
    }

    const { auditService } = await import(
      '@/lib/services/saas-core-service'
    );
    const logs = await auditService.getAuditLogs(schoolId, {
      action: action || undefined,
      skip,
      take,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error('GET /api/admin/audit-logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 7. SCHOOL DASHBOARD (SCHOOL_ADMIN access)
// ============================================================================

// app/api/school/billing/summary/route.ts - School's Billing Summary
export async function GET_BILLING_SUMMARY(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { billingService } = await import(
      '@/lib/services/saas-core-service'
    );
    const summary = await billingService.getBillingSummary(user.schoolId!);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('GET /api/school/billing/summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing summary' },
      { status: 500 }
    );
  }
}

// app/api/school/metrics/route.ts - School's Own Metrics
export async function GET_SCHOOL_METRICS(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantService } = await import(
      '@/lib/services/saas-core-service'
    );
    const metrics = await tenantService.getTenantMetrics(user.schoolId!);

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('GET /api/school/metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// ============================================================================
// 8. USAGE TRACKING (Called internally after AI sessions, etc)
// ============================================================================

// app/api/internal/usage/track/route.ts - Internal usage tracking
export async function POST_TRACK_USAGE(req: NextRequest) {
  try {
    // Verify internal call (from server-side only)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { schoolId, metricType, value } = body;

    if (!schoolId || !metricType || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { billingService } = await import(
      '@/lib/services/saas-core-service'
    );
    await billingService.trackUsage(schoolId, metricType, value);

    return NextResponse.json({
      success: true,
      message: 'Usage tracked',
    });
  } catch (error) {
    logger.error('POST /api/internal/usage/track error:', error);
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    );
  }
}

// ============================================================================
// END OF API REFERENCE IMPLEMENTATIONS
// ============================================================================
// To use these:
// 1. Copy the appropriate route handler to your app/api/[path]/route.ts files
// 2. Implement middleware for role-based access control
// 3. Add proper error handling and validation
// 4. Connect to database via Prisma
// ============================================================================
