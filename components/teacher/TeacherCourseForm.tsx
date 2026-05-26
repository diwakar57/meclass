'use client';

/**
 * TeacherCourseForm Component
 * Form for creating and editing courses
 */

import React, { useState } from 'react';

interface CourseFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
  initialData?: any;
}

export default function TeacherCourseForm({
  onSubmit,
  loading,
  initialData,
}: CourseFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    gradeId: initialData?.gradeId || '',
    subjectId: initialData?.subjectId || '',
    classId: initialData?.classId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    syllabusId: initialData?.syllabusId || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.gradeId) newErrors.gradeId = 'Grade is required';
    if (!formData.subjectId) newErrors.subjectId = 'Subject is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {initialData ? 'Edit Course' : 'Create New Course'}
        </h2>
      </div>

      {/* Course Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Grade 5 Mathematics - Spring 2024"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Brief description of the course..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        ></textarea>
      </div>

      {/* Grade & Subject */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grade Level *
          </label>
          <select
            name="gradeId"
            value={formData.gradeId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select grade...</option>
            <option value="grade-1">Grade 1</option>
            <option value="grade-2">Grade 2</option>
            <option value="grade-3">Grade 3</option>
            <option value="grade-4">Grade 4</option>
            <option value="grade-5">Grade 5</option>
            {/* More grades */}
          </select>
          {errors.gradeId && <p className="text-red-600 text-sm mt-1">{errors.gradeId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <select
            name="subjectId"
            value={formData.subjectId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select subject...</option>
            <option value="math">Mathematics</option>
            <option value="english">English Language Arts</option>
            <option value="science">Science</option>
            <option value="social-studies">Social Studies</option>
            {/* More subjects */}
          </select>
          {errors.subjectId && <p className="text-red-600 text-sm mt-1">{errors.subjectId}</p>}
        </div>
      </div>

      {/* Class */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Class (Optional - leave blank for whole grade)
        </label>
        <select
          name="classId"
          value={formData.classId}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">No specific class (whole grade)</option>
          <option value="class-1">Class 1</option>
          <option value="class-2">Class 2</option>
          {/* More classes */}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {errors.startDate && <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {errors.endDate && <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>}
        </div>
      </div>

      {/* Syllabus */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Base Curriculum/Syllabus (Optional)
        </label>
        <select
          name="syllabusId"
          value={formData.syllabusId}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Create custom course</option>
          {/* Fetch from API */}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          You can add topics and define the schedule after creating the course
        </p>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Creating...' : 'Create Course'}
        </button>
        <button
          type="button"
          className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
