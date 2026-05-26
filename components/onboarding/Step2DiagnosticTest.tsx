'use client';

/**
 * Step2DiagnosticTest Component
 * Student takes diagnostic test
 */

import React, { useState, useEffect } from 'react';

interface Step2Props {
  testId: string | null;
  onComplete: (responses: any[]) => void;
  loading: boolean;
}

interface Question {
  id: string;
  text: string;
  options: string[];
}

export default function Step2DiagnosticTest({ testId, onComplete, loading }: Step2Props) {
  const [test, setTest] = useState<{ id: string; questions: Question[] } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { optionIndex: number; time: number }>>({});
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testLoading, setTestLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load test on mount
  useEffect(() => {
    loadTest();
  }, [testId]);

  // Track start time
  useEffect(() => {
    if (test && testStartTime === null) {
      setTestStartTime(Date.now());
    }
  }, [test]);

  const loadTest = async () => {
    try {
      const res = await fetch('/api/students/onboarding/diagnostic-test', {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load diagnostic test');
      }

      const data = await res.json();
      if (data.test) {
        setTest(data.test);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  if (testLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-600">Loading diagnostic test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-red-600">{error || 'Failed to load test'}</p>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  const handleSelectOption = (optionIndex: number) => {
    const startTime = responses[currentQuestion.id]?.time || Date.now();
    const responseTime = Math.round((Date.now() - startTime) / 1000);

    setResponses({
      ...responses,
      [currentQuestion.id]: { optionIndex, time: responseTime },
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    const testResponses = test.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIndex: responses[q.id]?.optionIndex || 0,
      responseTime: responses[q.id]?.time || 60,
    }));

    onComplete(testResponses);
  };

  const isAnswered = currentQuestion.id in responses;
  const isComplete = test.questions.every((q) => q.id in responses);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Diagnostic Test</h2>
      <p className="text-gray-600 mb-6">
        Let's assess your knowledge from last year to personalize your learning plan
      </p>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestionIndex + 1} of {test.questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {currentQuestion.text}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                responses[currentQuestion.id]?.optionIndex === index
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 bg-white hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                    responses[currentQuestion.id]?.optionIndex === index
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-400'
                  }`}
                >
                  {responses[currentQuestion.id]?.optionIndex === index && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-gray-700">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentQuestionIndex < test.questions.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!isComplete || loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Test'}
          </button>
        )}
      </div>
    </div>
  );
}
