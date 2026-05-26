import type { LearnAIRole } from '@/lib/types/learnai-school';

export function ensureRoleAccess(
  requestedRole: string | null,
  allowedRoles: ReadonlyArray<LearnAIRole>,
): { ok: true; role: LearnAIRole } | { ok: false; error: string } {
  if (!requestedRole) {
    return { ok: false, error: 'Missing role query parameter.' };
  }

  if (!allowedRoles.includes(requestedRole as LearnAIRole)) {
    return { ok: false, error: `Role ${requestedRole} is not allowed for this endpoint.` };
  }

  return { ok: true, role: requestedRole as LearnAIRole };
}
