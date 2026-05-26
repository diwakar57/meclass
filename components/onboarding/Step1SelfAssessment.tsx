'use client';

/**
 * Step1SelfAssessment Component
 * Student self-assessment: grades, strengths, weaknesses, confidence
 */

import React, { useState } from 'react';

interface Step1Props {
  onComplete: (data: {
    currentGrade: string;
    previousGrade: string;
    selfAssessment: {
      strengths: string[];
      weaknesses: string[];
      confidenceScore: number;
    };
  }) => void;
  loading: boolean;
}

const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const STRENGTH_WEAKNESSES = [
  'Language & Writing',
  'Mathematics',
  'Science',
  'Reading Comprehension',
  'Problem Solving',
  'Memorization',
  'Creativity',
  'Time Management',
  'Attention to Detail',
  'Critical Thinking',
];

export default function Step1SelfAssessment({ onComplete, loading }: Step1Props) {
  const [currentGrade, setCurrentGrade] = useState('');
  const [previousGrade, setPreviousGrade] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [confidenceScore, setConfidenceScore] = useState(50);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentGrade) newErrors.currentGrade = 'Current grade is required';
    if (!previousGrade) newErrors.previousGrade = 'Previous grade is required';
    if (currentGrade === previousGrade) {
      newErrors.previousGrade = 'Previous grade must be different from current grade';
    }
    if (strengths.length === 0) newErrors.strengths = 'Select at least one strength';
    if (weaknesses.length === 0) newErrors.weaknesses = 'Select at least one weakness';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    onComplete({
      currentGrade,
      previousGrade,
      selfAssessment: {
        strengths,
        weaknesses,
        confidenceScore,
      },
    });
  };

  const toggleItem = (item: string, list: string[], setList: (items: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

 return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's Get to Know You</h2>
      <p className="text-gray-600 mb-6">
        Help us understand your learning profile so we can personalize your experience
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grade Selection */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What grade are you in now?
            </label>
            <select
              value={currentGrade}
              onChange={(e) => setCurrentGrade(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select grade...</option>
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
            {errors.currentGrade && <p className="text-red-600 text-sm mt-1">{errors.currentGrade}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What grade were you in last year?
            </label>
            <select
              value={previousGrade}
              onChange={(e) => setPreviousGrade(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select grade...</option>
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
            {errors.previousGrade && <p className="text-red-600 text-sm mt-1">{errors.previousGrade}</p>}
          </div>
        </div>

        {/* Strengths */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What are your strengths? (Select at least one)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {STRENGTH_WEAKNESSES.map((item) => (
              <button
                key={`strength-${item}`}
                type="button"
                onClick={() => toggleItem(item, strengths, setStrengths)}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                  strengths.includes(item)
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {errors.strengths && <p className="text-red-600 text-sm mt-2">{errors.strengths}</p>}
        </div>

        {/* Weaknesses */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What areas need improvement? (Select at least one)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {STRENGTH_WEAKNESSES.map((item) => (
              <button
                key={`weakness-${item}`}
                type="button"
                onClick={() => toggleItem(item, weaknesses, setWeaknesses)}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                  weaknesses.includes(item)
                    ? 'border-red-500 bg-red-50 text-red-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {errors.weaknesses && <p className="text-red-600 text-sm mt-2">{errors.weaknesses}</p>}
        </div>

        {/* Confidence Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How confident are you in your knowledge of {previousGrade && `Grade ${previousGrade}`} material?
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={confidenceScore}
              onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Not confident (0)</span>
              <span className="font-bold text-indigo-600">{confidenceScore}%</span>
              <span>Very confident (100)</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
        >
          {loading ? 'Processing...' : 'Continue to Diagnostic Test'}
        </button>
      </form>
    </div>
  );
}
