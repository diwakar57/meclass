/**
 * Course types - Student-generated courses from syllabi
 */

export interface Course {
  id: string;
  schoolId: string;
  studentId: string;
  syllabusId: string;
  title: string;
  description?: string;
  filePath?: string; // Filesystem path: /public/courses/{courseId}/index.html
  fileSize?: number;
  generationStatus: 'pending' | 'generating' | 'success' | 'failed';
  errorMessage?: string;
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseFile {
  id: string;
  courseId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: Date;
}

export interface GenerateCourseInput {
  syllabusId: string;
  studentId?: string; // If not provided, use from auth context
}

export interface GenerateCourseResponse {
  courseId: string;
  status: 'pending' | 'generating' | 'success' | 'failed';
  title: string;
  message: string;
}

export interface CourseDownload {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}
