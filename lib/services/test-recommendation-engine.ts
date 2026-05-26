/**
 * Test Recommendation Engine Service
 * 
 * Recommends appropriate tests for students based on their:
 * - Confidence scores (from previous test attempts)
 * - Current learning pace and adaptive pacing (slow/standard/fast)
 * - Performance history (strengths vs weaknesses)
 * - Next topic in their adaptive class schedule
 */

import { createLogger } from '@/lib/logger';
import { query } from '@/lib/db';
import type { PaceRecommendation } from '@/lib/adaptive-class-generator/types';

const log = createLogger('TestRecommendationEngine');

export interface StudentConfidenceProfile {
  studentId: string;
  averageConfidence: number;
  confidenceByTopic: Record<string, number>;
  recentTestCount: number;
  lastTestDate: Date | null;
  paceMultiplier: number;
  masteredTopics: string[];
  weakTopics: string[];
  readyForChallenge: boolean;
}

export interface TestRecommendation {
  testId: string;
  testTitle: string;
  topicId: string;
  topicName: string;
  difficulty: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  confidenceReason: string;
  paceAlignment: 'slow' | 'standard' | 'fast';
  urgency: 'low' | 'medium' | 'high'; // How important is this test for learning progression
  recommendationScore: number; // 0-100, higher = better match
  expectedDuration: number; // Adjusted for pace
}

export interface RecommendedTestsResponse {
  studentId: string;
  totalRecommendationScore: number;
  recommendedTests: TestRecommendation[];
  nextImmediateTest: TestRecommendation | null;
  summary: {
    confidenceLevel: 'low' | 'medium' | 'high';
    suggestedAction: string;
    masteryProgress: number; // 0-100
  };
}

/**
 * Get student's confidence profile from test attempts
 */
export async function getStudentConfidenceProfile(
  studentId: string,
  schoolId: string
): Promise<StudentConfidenceProfile> {
  try {
    // Get recent test attempts with confidence data
    const testAttemptsResult = await query(
      `SELECT 
        ta.id, ta.test_id, ta.score, ta.max_score, ta.created_at,
        json_agg(json_build_object('confidenceScore', aa.confidence_score, 'isCorrect', aa.is_correct)) as answers
       FROM test_attempts ta
       LEFT JOIN question_answers aa ON ta.id = aa.test_attempt_id
       WHERE ta.student_id = $1 AND ta.school_id = $2 AND ta.created_at > NOW() - INTERVAL '60 days'
       GROUP BY ta.id, ta.test_id, ta.score, ta.max_score, ta.created_at
       ORDER BY ta.created_at DESC
       LIMIT 20`,
      [studentId, schoolId]
    );

    // Get learning plan and adaptive pace
    const learningPlanResult = await query(
      `SELECT lp.id, AVG(sc.pace_multiplier) as avg_pace_multiplier
       FROM learning_plans lp
       LEFT JOIN scheduled_classes sc ON lp.id = sc.learning_plan_id
       WHERE lp.student_id = $1 AND lp.school_id = $2 AND lp.status = 'active'
       GROUP BY lp.id`,
      [studentId, schoolId]
    );

    const paceMultiplier = learningPlanResult.rows[0]?.avg_pace_multiplier || 1;

    // Get learning_dna for mastery levels
    const learningDNAResult = await query(
      `SELECT diagnostic_result FROM learning_dna WHERE student_id = $1 LIMIT 1`,
      [studentId]
    );

    const diagnosticResult = learningDNAResult.rows[0]?.diagnostic_result || {};
    const masteredTopics = diagnosticResult.masteredTopics || [];
    const weakTopics = diagnosticResult.weakTopics || [];

    // Calculate confidence metrics
    const confidenceByTopic: Record<string, number> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const attempt of testAttemptsResult.rows) {
      const answers = attempt.answers || [];
      const topicConfidences = answers
        .filter((a: any) => a.confidenceScore !== null)
        .map((a: any) => (a.confidenceScore || 3) * 20); // Convert 1-5 to 0-100

      if (topicConfidences.length > 0) {
        const avgConfidence = topicConfidences.reduce((a: number, b: number) => a + b, 0) / topicConfidences.length;
        totalConfidence += avgConfidence;
        confidenceCount++;
      }
    }

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 50;

    // Determine if student is ready for challenge
    const readyForChallenge =
      averageConfidence > 70 && testAttemptsResult.rows.length > 2;

    return {
      studentId,
      averageConfidence: Math.round(averageConfidence),
      confidenceByTopic,
      recentTestCount: testAttemptsResult.rows.length,
      lastTestDate: testAttemptsResult.rows[0]?.created_at || null,
      paceMultiplier,
      masteredTopics,
      weakTopics,
      readyForChallenge,
    };
  } catch (error) {
    log.error('Failed to get student confidence profile:', error);
    throw error;
  }
}

/**
 * Get next topic from adaptive class schedule
 */
async function getNextAdaptiveClassTopic(
  studentId: string,
  schoolId: string
): Promise<{ topicId: string; topicName: string } | null> {
  try {
    const result = await query(
      `SELECT sc.topic_id, sc.topic_name
       FROM scheduled_classes sc
       JOIN learning_plans lp ON sc.learning_plan_id = lp.id
       WHERE lp.student_id = $1 AND lp.school_id = $2 AND sc.status IN ('pending', 'in-progress')
       ORDER BY sc.order_index ASC
       LIMIT 1`,
      [studentId, schoolId]
    );

    if (result.rows[0]) {
      return {
        topicId: result.rows[0].topic_id,
        topicName: result.rows[0].topic_name,
      };
    }

    return null;
  } catch (error) {
    log.error('Failed to get next adaptive class topic:', error);
    return null;
  }
}

/**
 * Recommend tests based on student's confidence and pace
 */
export async function recommendTestsForStudent(
  studentId: string,
  schoolId: string
): Promise<RecommendedTestsResponse> {
  try {
    // Get confidence profile
    const profile = await getStudentConfidenceProfile(studentId, schoolId);

    // Get next adaptive class topic
    const nextTopic = await getNextAdaptiveClassTopic(studentId, schoolId);

    // Get available tests
    const availableTestsResult = await query(
      `SELECT id, title, topic_id, topic_name, difficulty_level, estimated_duration_minutes
       FROM tests
       WHERE school_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 50`,
      [schoolId]
    );

    const availableTests = availableTestsResult.rows || [];

    // Score and rank tests
    const recommendations: TestRecommendation[] = [];

    for (const test of availableTests) {
      // Calculate recommendation score (0-100)
      let scoreAndAlignment = calculateTestRecommendationScore(
        test,
        profile,
        nextTopic
      );

      if (scoreAndAlignment.score > 30) {
        // Only include tests with meaningful scores
        recommendations.push({
          testId: test.id,
          testTitle: test.title,
          topicId: test.topic_id,
          topicName: test.topic_name,
          difficulty: mapDifficultyLevel(test.difficulty_level),
          estimatedMinutes: test.estimated_duration_minutes,
          paceAlignment: scoreAndAlignment.paceAlignment,
          confidenceReason: scoreAndAlignment.reason,
          urgency: scoreAndAlignment.urgency,
          recommendationScore: scoreAndAlignment.score,
          expectedDuration: Math.round(test.estimated_duration_minutes / profile.paceMultiplier),
        });
      }
    }

    // Sort by recommendation score (highest first)
    recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Determine confidence level
    let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
    if (profile.averageConfidence < 40) {
      confidenceLevel = 'low';
    } else if (profile.averageConfidence > 75) {
      confidenceLevel = 'high';
    }

    // Generate suggested action
    let suggestedAction = '';
    if (confidenceLevel === 'low' && recommendations.length > 0) {
      suggestedAction =
        `Your confidence is low (${profile.averageConfidence}%). Start with the recommended basic test to build foundation.`;
    } else if (confidenceLevel === 'high' && profile.readyForChallenge && recommendations.length > 0) {
      suggestedAction = `You're performing well! Try an advanced test to challenge yourself.`;
    } else if (recommendations.length === 0) {
      suggestedAction = 'No tests available. Check with your teacher to add tests to your curriculum.';
    } else {
      suggestedAction = `Your confidence is at ${profile.averageConfidence}%. The recommended tests match your learning pace.`;
    }

    // Calculate mastery progress
    const masteryProgress = Math.min(
      100,
      Math.max(0, profile.averageConfidence + (profile.masteredTopics.length * 5))
    );

    return {
      studentId,
      totalRecommendationScore: recommendations.reduce((sum, t) => sum + t.recommendationScore, 0),
      recommendedTests: recommendations.slice(0, 10), // Top 10 recommendations
      nextImmediateTest: recommendations[0] || null,
      summary: {
        confidenceLevel,
        suggestedAction,
        masteryProgress,
      },
    };
  } catch (error) {
    log.error('Failed to recommend tests for student:', error);
    throw error;
  }
}

/**
 * Calculate recommendation score for a specific test
 */
function calculateTestRecommendationScore(
  test: any,
  profile: StudentConfidenceProfile,
  nextTopic: { topicId: string; topicName: string } | null
): {
  score: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  paceAlignment: 'slow' | 'standard' | 'fast';
} {
  let score = 50; // Base score
  let reasons: string[] = [];
  let urgency: 'low' | 'medium' | 'high' = 'medium';
  let paceAlignment: 'slow' | 'standard' | 'fast' = 'standard';

  // 1. Match with next adaptive class topic
  if (nextTopic && test.topic_id === nextTopic.topicId) {
    score += 30;
    reasons.push('Aligns with next class topic');
    urgency = 'high';
  }

  // 2. Confidence-based recommendation
  if (profile.averageConfidence < 40) {
    // Low confidence - recommend easier tests
    if (test.difficulty_level <= 3) {
      score += 20;
      reasons.push('Recommended for building confidence');
      paceAlignment = 'slow';
    } else {
      score -= 15;
    }
  } else if (profile.averageConfidence > 80 && profile.readyForChallenge) {
    // High confidence - recommend harder tests
    if (test.difficulty_level >= 7) {
      score += 20;
      reasons.push('Challenge test for advanced learner');
      paceAlignment = 'fast';
      urgency = 'low';
    } else {
      score -= 10;
    }
  } else {
    // Medium confidence - recommend medium difficulty
    if (test.difficulty_level >= 4 && test.difficulty_level <= 6) {
      score += 15;
      reasons.push('Appropriate difficulty for current level');
    }
  }

  // 3. Weak topic reinforcement
  if (profile.weakTopics.includes(test.topic_id)) {
    score += 25;
    reasons.push('Reinforces weak topic');
    urgency = 'high';
  }

  // 4. Mastered topic (low priority)
  if (profile.masteredTopics.includes(test.topic_id)) {
    score -= 20;
    urgency = 'low';
  }

  // 5. Pace alignment
  const paceMultiplier = profile.paceMultiplier;
  if (paceMultiplier < 0.75) {
    // Slow pace - prefer shorter tests
    if (test.estimated_duration_minutes <= 20) {
      score += 10;
      paceAlignment = 'slow';
    }
  } else if (paceMultiplier > 1.25) {
    // Fast pace - allow longer tests
    if (test.estimated_duration_minutes > 30) {
      score += 10;
      paceAlignment = 'fast';
    }
  }

  // 6. Time since last test (recency penalty)
  if (profile.lastTestDate) {
    const daysSinceLastTest = Math.floor(
      (Date.now() - profile.lastTestDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastTest > 7) {
      score += 10;
      reasons.push('Time for a refresher');
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const reason = reasons.length > 0 ? reasons[0] : 'Matches your learning profile';

  return {
    score: finalScore,
    reason,
    urgency,
    paceAlignment,
  };
}

/**
 * Helper function to map difficulty level to string
 */
function mapDifficultyLevel(level: number): 'low' | 'medium' | 'high' {
  if (level <= 3) return 'low';
  if (level <= 6) return 'medium';
  return 'high';
}

/**
 * Get tests by confidence gap (topics where confidence is low but student is ready)
 */
export async function getTestsByConfidenceGap(
  studentId: string,
  schoolId: string
): Promise<TestRecommendation[]> {
  try {
    const profile = await getStudentConfidenceProfile(studentId, schoolId);

    // Find topics where confidence < 50 but should be working on
    const gapTopics = Object.entries(profile.confidenceByTopic)
      .filter(([_, confidence]) => confidence < 50)
      .map(([topicId, _]) => topicId);

    if (gapTopics.length === 0) {
      return [];
    }

    // Get tests for gap topics
    const testsResult = await query(
      `SELECT id, title, topic_id, topic_name, difficulty_level, estimated_duration_minutes
       FROM tests
       WHERE school_id = $1 AND topic_id = ANY($2) AND status = 'active'
       ORDER BY difficulty_level ASC`,
      [schoolId, gapTopics]
    );

    return testsResult.rows.map((test) => ({
      testId: test.id,
      testTitle: test.title,
      topicId: test.topic_id,
      topicName: test.topic_name,
      difficulty: mapDifficultyLevel(test.difficulty_level),
      estimatedMinutes: test.estimated_duration_minutes,
      paceAlignment: 'standard' as const,
      confidenceReason: 'Test identified confidence gap - low confidence in this topic',
      urgency: 'medium' as const,
      recommendationScore: 85,
      expectedDuration: Math.round(test.estimated_duration_minutes / profile.paceMultiplier),
    }));
  } catch (error) {
    log.error('Failed to get tests by confidence gap:', error);
    return [];
  }
}
