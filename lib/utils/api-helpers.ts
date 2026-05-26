import { NextResponse } from 'next/server';

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface APIError {
  status: number;
  message: string;
}

/**
 * Success response helper
 */
export function apiSuccess<T = unknown>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<APIResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Error response helper
 */
export function apiError(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<APIResponse> {
  const errorObj: APIResponse = {
    success: false,
    error: message,
  };

  if (details && process.env.NODE_ENV === 'development') {
    console.error(`[API Error] ${message}`, details);
  }

  return NextResponse.json(errorObj, { status });
}

/**
 * Unauthorized error
 */
export function apiUnauthorized(message: string = 'Unauthorized'): NextResponse<APIResponse> {
  return apiError(message, 401);
}

/**
 * Forbidden error
 */
export function apiForbidden(message: string = 'Forbidden'): NextResponse<APIResponse> {
  return apiError(message, 403);
}

/**
 * Not found error
 */
export function apiNotFound(message: string = 'Not found'): NextResponse<APIResponse> {
  return apiError(message, 404);
}

/**
 * Internal server error
 */
export function apiServerError(message: string = 'Internal server error'): NextResponse<APIResponse> {
  return apiError(message, 500);
}

/**
 * Validation error
 */
export function apiValidationError(message: string = 'Validation failed', details?: unknown): NextResponse<APIResponse> {
  return apiError(message, 422, details);
}
