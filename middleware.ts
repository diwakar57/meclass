import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyRefreshToken } from '@/lib/auth/jwt';

// IMPORTANT: Keep this in sync with lib/auth/role-redirects.ts DASHBOARD_ROUTES
const DASHBOARD_ROUTES: Record<string, string> = {
  student: '/dashboard/student',
  teacher: '/dashboard/teacher',
  principal: '/dashboard/principal',
  school_admin: '/dashboard/principal',
  accountant: '/dashboard/accountant',
  supervisor: '/dashboard/supervisor',
  parent: '/dashboard/parent',
  admin: '/dashboard/admin',
  saas_admin: '/dashboard/admin',
};

// Pages that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/landing',
  '/about',
  '/features',
  '/pricing',
  '/contact',
  '/login',
  '/signup',
  '/student-registration',
  '/school-registration',
  '/forgot-password',
  '/reset-password',
  '/register-school',
  '/faq',
  '/auth/login',
  '/auth/signup',
  '/auth/signup/student',
  '/auth/signup/teacher',
  '/auth/signup/principal',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

// API routes that don't require authentication
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
  '/api/provider-config',
  '/api/public',
  '/api/contact',
  '/api/schools/register',
];

// Routes that require specific roles (must match actual route structure)
const ROLE_BASED_ROUTES: Record<string, string[]> = {
  '/admin': ['saas_admin'],
  '/student': ['student'],
  '/parent': ['parent'],
  '/teacher': ['teacher'],
  '/principal': ['principal', 'school_admin'],
  '/accountant': ['accountant'],
  '/supervisor': ['supervisor'],
  '/dashboard/admin': ['saas_admin'],
  '/dashboard/student': ['student'],
  '/dashboard/parent': ['parent'],
  '/dashboard/teacher': ['teacher'],
  '/dashboard/principal': ['principal', 'school_admin'],
  '/dashboard/accountant': ['accountant'],
  '/dashboard/supervisor': ['supervisor'],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public paths without auth
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Allow public API paths without auth
  if (PUBLIC_API_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('accessToken')?.value || request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // If no token, redirect to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Verify token
    const user = await verifyToken(token);

    if (!user) {
      throw new Error('Invalid token');
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(ROLE_BASED_ROUTES)) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        if (!allowedRoles.includes(user.role as string)) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
          // Redirect to user's correct dashboard using the dashboard routes map
          const correctDashboard = DASHBOARD_ROUTES[user.role as string] || '/auth/login';
          return NextResponse.redirect(new URL(correctDashboard, request.url));
        }
      }
    }

    // Token is valid, continue
    const response = NextResponse.next();
    
    // Optionally refresh token if it's about to expire
    const expiresAt = (user.exp as number) * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const thresholdMs = 5 * 60 * 1000; // 5 minutes
    
    if (timeUntilExpiry < thresholdMs && refreshToken) {
      // Token will expire soon, could trigger refresh
      // (In production, handle token refresh here or let client handle it)
      response.headers.set('X-Token-Expiring-Soon', 'true');
    }

    return response;
  } catch (error) {
    // Token is invalid or expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Try to refresh token if refresh token exists
    if (refreshToken) {
      try {
        const verifiedRefresh = await verifyRefreshToken(refreshToken);
        if (verifiedRefresh) {
          // Refresh token is valid - let the client call /api/auth/refresh
          const refreshResponse = NextResponse.next();
          refreshResponse.headers.set('X-Token-Expired', 'true');
          return refreshResponse;
        }
      } catch {
        // Refresh token is also invalid
      }
    }

    // Redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

// Configure which routes use middleware
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
