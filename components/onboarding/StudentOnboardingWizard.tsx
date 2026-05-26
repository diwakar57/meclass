'use client';

/**
 * StudentOnboardingWizard Component
 * Multi-step onboarding wizard for new students
 */

import React, { useState, useEffect } from 'react';
import Step1SelfAssessment from './Step1SelfAssessment';
import Step2DiagnosticTest from './Step2DiagnosticTest';
import Step4ReviewPlan from './Step4ReviewPlan';

interface OnboardingWizardProps {
  studentId: string;
  onComplete?: () => void;
}

export default function StudentOnboardingWizard({ studentId, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [diagnosticScore, setDiagnosticScore] = useState<number | null>(null);

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const res = await fetch('/api/students/onboarding/status', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && !data.onboarding.completed) {
        setCurrentStep(data.onboarding.currentStep);
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
    }
  };

  const handleStep1Complete = async (data: {
    currentGrade: string;
    previousGrade: string;
    selfAssessment: {
      strengths: string[];
      weaknesses: string[];
      confidenceScore: number;
    };
  }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/students/onboarding/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete step 1');
      }

      const result = await res.json();
      setCurrentStep(result.currentStep);

      // Generate diagnostic test
      await generateDiagnosticTest(data.previousGrade);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDiagnosticTest = async (previousGrade: string) => {
    try {
      const res = await fetch('/api/students/onboarding/diagnostic-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate diagnostic test');
      }

      const result = await res.json();
      if (result.testId) {
        setTestId(result.testId);
      }
      setCurrentStep(result.currentStep || 2);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStep2Complete = async (responses: any[]) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/students/onboarding/diagnostic-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          responses,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit test');
      }

      const result = await res.json();
      setDiagnosticScore(result.score);
      setCurrentStep(result.currentStep || 4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/students/onboarding/complete', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete onboarding');
      }

      onComplete?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of 4</span>
            <span>{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Steps */}
        {currentStep === 1 && (
          <Step1SelfAssessment
            onComplete={handleStep1Complete}
            loading={loading}
          />
        )}

        {currentStep === 2 && (
          <Step2DiagnosticTest
            testId={testId}
            onComplete={handleStep2Complete}
            loading={loading}
          />
        )}

        {currentStep === 4 && (
          <Step4ReviewPlan
            diagnosticScore={diagnosticScore}
            onComplete={handleOnboardingComplete}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
