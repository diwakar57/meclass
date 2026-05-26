import { apiSuccess } from '@/lib/server/api-response';
import { LearnAIService } from '@/lib/server/learnai/service';

const learnAIService = new LearnAIService();

export async function GET() {
  return apiSuccess({
    branding: 'Designed and operated by LearnAI.study',
    data: learnAIService.getBootstrap(),
  });
}
