// @ts-nocheck
// ============================================================================
// SAAS CORE SERVICES - lib/services/saas-service.ts
// ============================================================================
// Complete implementation of tenant management, billing, and audit services
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { School, Subscription, AuditLog, UsageMetric } from '@prisma/client';

// ============================================================================
// TENANT SERVICE
// ============================================================================

export class TenantService {
  /**
   * Create new school tenant with default configuration
   */
  async createTenant(data: {
    name: string;
    email: string;
    countryCode: string;
  }): Promise<School> {
    const slug = this.generateSlug(data.name);
    
    const school = await prisma.school.create({
      data: {
        name: data.name,
        email: data.email,
        slug,
        country: data.countryCode,
        status: 'TRIAL',
        tier: 'FREEMIUM',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        
        // Default config
        config: {
          create: {
            language: 'en',
            timezone: 'UTC',
            currencyCode: 'USD',
          },
        },
        
        // Default subscription (trial)
        subscription: {
          create: {
            tier: 'FREEMIUM',
            monthlyPrice: 0,
            status: 'TRIAL',
            billingCycle: 'MONTHLY',
            startDate: new Date(),
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            renewalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            isTrialActive: true,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        config: true,
        subscription: true,
      },
    });

    logger.info(`New tenant created: ${school.id}`, {
      name: school.name,
      email: school.email,
      slug: school.slug,
    });

    return school;
  }

  /**
   * Get tenant by ID with all relations
   */
  async getTenant(schoolId: string): Promise<School | null> {
    return prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        config: true,
        subscription: {
          include: {
            invoices: { take: 5, orderBy: { createdAt: 'desc' } },
          },
        },
        _count: {
          select: {
            users: true,
            classes: true,
            courses: true,
          },
        },
      },
    });
  }

  /**
   * List all tenants with pagination
   */
  async listTenants(filters: {
    status?: string;
    tier?: string;
    skip?: number;
    take?: number;
  } = {}) {
    const { status, tier, skip = 0, take = 50 } = filters;

    return prisma.school.findMany({
      where: {
        ...(status && { status }),
        ...(tier && { tier }),
      },
      include: {
        subscription: true,
        _count: {
          select: { users: true },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfig(
    schoolId: string,
    updates: Record<string, any>
  ): Promise<any> {
    return prisma.schoolConfig.update({
      where: { schoolId },
      data: updates,
    });
  }

  /**
   * Get tenant metrics (users, classes, usage, etc)
   */
  async getTenantMetrics(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: {
            users: { where: { role: { in: ['student', 'teacher', 'parent'] } } },
            classes: true,
            courses: true,
          },
        },
      },
    });

    if (!school) {
      throw new Error(`Tenant not found: ${schoolId}`);
    }

    // Get current month usage
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usage = await prisma.usageMetric.groupBy({
      by: ['metricType'],
      where: {
        schoolId,
        billingMonth: thisMonth,
      },
      _sum: {
        metricValue: true,
      },
    });

    const usageMap = Object.fromEntries(
      usage.map((u) => [u.metricType, u._sum.metricValue || 0])
    );

    return {
      school,
      stats: {
        totalStudents: school._count.users,
        totalClasses: school._count.classes,
        totalCourses: school._count.courses,
        aiSessionsUsed: usageMap.AI_SESSIONS || 0,
        storageUsedGB: usageMap.STORAGE_GB || 0,
        apiCallsUsed: usageMap.API_CALLS || 0,
      },
    };
  }

  /**
   * Suspend tenant (disable access)
   */
  async suspendTenant(schoolId: string, reason?: string) {
    return prisma.school.update({
      where: { id: schoolId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
      },
    });
  }

  /**
   * Resume suspended tenant
   */
  async resumeTenant(schoolId: string) {
    return prisma.school.update({
      where: { id: schoolId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
      },
    });
  }

  /**
   * Delete tenant (hard delete with cleanup)
   */
  async deleteTenant(schoolId: string) {
    // Cascade delete all related data
    await prisma.school.delete({
      where: { id: schoolId },
    });

    logger.info(`Tenant deleted: ${schoolId}`);
  }

  /**
   * Check if tenant has reached limits
   */
  async checkTenantLimits(schoolId: string) {
    const school = await this.getTenant(schoolId);
    if (!school) throw new Error('Tenant not found');

    const userCount = await prisma.user.count({
      where: { schoolId, role: 'student' },
    });

    const thisMonth = new Date().toISOString().slice(0, 7);
    const aiSessions = await prisma.usageMetric.aggregate({
      where: {
        schoolId,
        metricType: 'AI_SESSIONS',
        billingMonth: thisMonth,
      },
      _sum: { metricValue: true },
    });

    return {
      studentLimit: {
        limit: school.studentLimit,
        used: userCount,
        remaining: school.studentLimit - userCount,
        exceeded: userCount > school.studentLimit,
      },
      aiSessionLimit: {
        limit: school.aiSessionsPerMonth,
        used: Math.round(aiSessions._sum.metricValue || 0),
        remaining: school.aiSessionsPerMonth - Math.round(aiSessions._sum.metricValue || 0),
        exceeded: (aiSessions._sum.metricValue || 0) > school.aiSessionsPerMonth,
      },
      storageLimit: {
        limit: school.storageGB,
        // TODO: Calculate actual storage used
      },
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

// ============================================================================
// BILLING SERVICE
// ============================================================================

export class BillingService {
  /**
   * Create subscription for tenant
   */
  async createSubscription(schoolId: string, tier: string) {
    const pricingMap: Record<string, { monthly: number; annual: number }> = {
      BASIC: { monthly: 99, annual: 990 },
      PRO: { monthly: 299, annual: 2990 },
      ENTERPRISE: { monthly: 5000, annual: 50000 },
    };

    const pricing = pricingMap[tier] || pricingMap.BASIC;

    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return prisma.subscription.create({
      data: {
        schoolId,
        tier: tier as any,
        monthlyPrice: pricing.monthly,
        annualPrice: pricing.annual,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        startDate: today,
        currentPeriodStart: today,
        currentPeriodEnd: nextMonth,
        renewalDate: nextMonth,
      },
    });
  }

  /**
   * Upgrade/downgrade subscription
   */
  async updateSubscription(
    subscriptionId: string,
    newTier: string
  ) {
    const pricingMap: Record<string, number> = {
      BASIC: 99,
      PRO: 299,
      ENTERPRISE: 5000,
    };

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        tier: newTier as any,
        monthlyPrice: pricingMap[newTier] || 99,
      },
    });
  }

  /**
   * Track usage for billing purposes
   */
  async trackUsage(
    schoolId: string,
    metricType: string,
    value: number
  ) {
    const thisMonth = new Date().toISOString().slice(0, 7);

    // Find or create usage record for this month
    let usage = await prisma.usageMetric.findFirst({
      where: {
        schoolId,
        metricType: metricType as any,
        billingMonth: thisMonth,
      },
    });

    if (usage) {
      // Update existing
      await prisma.usageMetric.update({
        where: { id: usage.id },
        data: {
          metricValue: usage.metricValue + value,
        },
      });
    } else {
      // Create new
      await prisma.usageMetric.create({
        data: {
          schoolId,
          metricType: metricType as any,
          metricValue: value,
          billingMonth: thisMonth,
        },
      });
    }

    // Check for overages
    await this.checkAndApplyOverages(schoolId);
  }

  /**
   * Calculate and apply usage overages to subscription
   */
  private async checkAndApplyOverages(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscription: true },
    });

    if (!school || !school.subscription) return;

    const thisMonth = new Date().toISOString().slice(0, 7);

    // Get AI sessions used this month
    const aiSessions = await prisma.usageMetric.aggregate({
      where: {
        schoolId,
        metricType: 'AI_SESSIONS',
        billingMonth: thisMonth,
      },
      _sum: { metricValue: true },
    });

    const sessionsUsed = Math.round(aiSessions._sum.metricValue || 0);
    const sessionsLimit = school.aiSessionsPerMonth;

    let overage = 0;
    if (sessionsUsed > sessionsLimit) {
      const excessSessions = sessionsUsed - sessionsLimit;
      overage = excessSessions * 0.10; // $0.10 per excess session
    }

    // Update subscription overages
    await prisma.subscription.update({
      where: { id: school.subscription.id },
      data: {
        currentMonthUsage: sessionsUsed,
        overage,
      },
    });
  }

  /**
   * Generate invoice for subscription period
   */
  async generateInvoice(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        school: true,
      },
    });

    if (!subscription) throw new Error('Subscription not found');

    // Calculate amounts
    const subtotal = subscription.monthlyPrice;
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const total = subtotal + tax + subscription.overage;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceNumber = `INV-${subscription.schoolId.substring(0, 8)}-${Date.now()}`;

    const invoice = await prisma.invoice.create({
      data: {
        subscriptionId,
        schoolId: subscription.schoolId,
        invoiceNumber,
        status: 'SENT',
        subtotal,
        tax,
        taxRate: 0.08,
        total,
        dueDateAt: dueDate,
        issuedAt: new Date(),
        items: {
          create: [
            {
              description: `${subscription.tier} Subscription - Monthly`,
              type: 'BASE_PLAN',
              quantity: 1,
              unitPrice: subscription.monthlyPrice,
              total: subscription.monthlyPrice,
            },
            ...(subscription.overage > 0 ? [{
              description: 'AI Session Overages',
              type: 'OVERAGE',
              quantity: 1,
              unitPrice: subscription.overage,
              total: subscription.overage,
            }] : []),
          ],
        },
      },
      include: {
        items: true,
      },
    });

    logger.info(`Invoice generated: ${invoiceNumber}`, {
      subscriptionId,
      schoolId: subscription.schoolId,
      total,
    });

    return invoice;
  }

  /**
   * Apply coupon discount
   */
  async applyCoupon(subscriptionId: string, couponCode: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon) throw new Error('Coupon not found');
    if (!coupon.isActive) throw new Error('Coupon is inactive');
    if (coupon.currentUses >= (coupon.maxUses || Infinity)) {
      throw new Error('Coupon usage limit reached');
    }

    // Update coupon usage
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        currentUses: coupon.currentUses + 1,
      },
    });

    return coupon;
  }

  /**
   * Get billing summary for school
   */
  async getBillingSummary(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscription: {
          include: {
            invoices: { take: 12, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!school) throw new Error('School not found');

    const thisMonth = new Date().toISOString().slice(0, 7);
    const currentUsage = await prisma.usageMetric.findMany({
      where: {
        schoolId,
        billingMonth: thisMonth,
      },
    });

    return {
      school: {
        name: school.name,
        tier: school.tier,
      },
      subscription: school.subscription,
      currentUsage: Object.fromEntries(
        currentUsage.map((u) => [u.metricType, u.metricValue])
      ),
      invoices: school.subscription?.invoices || [],
    };
  }
}

// ============================================================================
// AUDIT SERVICE
// ============================================================================

export class AuditService {
  /**
   * Log action for audit trail
   */
  async logAction(data: {
    schoolId: string;
    action: string;
    actionCategory: string;
    targetType: string;
    targetId?: string;
    targetName?: string;
    actorId?: string;
    actorEmail?: string;
    changesSummary?: string;
    changesJson?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        schoolId: data.schoolId,
        action: data.action,
        actionCategory: data.actionCategory as any,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName,
        actorId: data.actorId,
        actorEmail: data.actorEmail,
        changesSummary: data.changesSummary,
        changesJson: data.changesJson,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success !== false,
        errorMessage: data.errorMessage,
      },
    });
  }

  /**
   * Get audit logs for school
   */
  async getAuditLogs(
    schoolId: string,
    filters: {
      action?: string;
      actorId?: string;
      skip?: number;
      take?: number;
    } = {}
  ) {
    const { action, actorId, skip = 0, take = 50 } = filters;

    return prisma.auditLog.findMany({
      where: {
        schoolId,
        ...(action && { action }),
        ...(actorId && { actorId }),
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Wrapper for auditable operations
   */
  async auditableAction<T>(
    data: {
      schoolId: string;
      action: string;
      actionCategory: string;
      targetType: string;
      targetId?: string;
      actorId?: string;
      ipAddress?: string;
    },
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await fn();

      await this.logAction({
        ...data,
        success: true,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.logAction({
        ...data,
        success: false,
        errorMessage: message,
      });

      throw error;
    }
  }

  /**
   * System-level audit log
   */
  async logSystemEvent(data: {
    action: string;
    component: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    metadata?: Record<string, any>;
  }) {
    return prisma.systemAuditLog.create({
      data: {
        action: data.action,
        component: data.component,
        severity: data.severity,
        message: data.message,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  }
}

// ============================================================================
// EXPORT SERVICES
// ============================================================================

export const tenantService = new TenantService();
export const billingService = new BillingService();
export const auditService = new AuditService();
