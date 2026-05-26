import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { LearningDNAService } from '@/lib/services/learning-dna';

export const GET = withRole(['student'], async (_req: NextRequest, auth: AuthContext) => {
  const dna = await LearningDNAService.getLearningDNA(auth.userId);

  if (!dna) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      paceType: dna.paceType,
      mistakeType: dna.mistakeType,
      preferredStyle: dna.preferredStyle,
      attentionSpanScore: dna.attentionSpanScore,
      recoveryRate: dna.recoveryRate,
      lastUpdated: dna.lastUpdated,
    },
  });
});
