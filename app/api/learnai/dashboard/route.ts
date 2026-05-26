import { type NextRequest } from 'next/server';
import { API_ERROR_CODES, apiError, apiSuccess } from '@/lib/server/api-response';
import { ensureRoleAccess } from '@/lib/server/learnai/guards';
import { LearnAIService } from '@/lib/server/learnai/service';

const learnAIService = new LearnAIService();

export async function GET(request: NextRequest) {
  const roleResult = ensureRoleAccess(request.nextUrl.searchParams.get('role'), [
    'saas_admin',
    'principal',
    'teacher',
    'student',
    'parent',
    'accountant',
    'supervisor',
  ]);

  if (!roleResult.ok) {
    return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, roleResult.error);
  }

  const dashboard = learnAIService.getRoleDashboard(roleResult.role);

  return apiSuccess({
    branding: 'Designed and operated by LearnAI.study',
    dashboard,
  });
}
