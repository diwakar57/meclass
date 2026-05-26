/**
 * Course Generation Service - Orchestrates entire flow
 * Fetches syllabus, calls scraper, saves files
 */

import { getSyllabus } from '@/lib/syllabi/syllabus-service';
import { getStudentProfile } from '@/lib/student/student-service';
import { scrapeOpenMaicContent } from '@/lib/scraping/puppeteer-scraper';
import { saveCourseContent } from '@/lib/filesystem/course-storage';
import { createCourse, updateCourseStatus } from '@/lib/courses/course-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('CourseGenerationService');

interface GenerationContext {
  schoolId: string;
  studentId: string;
  syllabusId: string;
}

/**
 * Generate course from syllabus and save to filesystem
 * Main orchestrator function
 */
export async function generateCourseFromSyllabus(context: GenerationContext): Promise<{
  success: boolean;
  courseId?: string;
  error?: string;
}> {
  const { schoolId, studentId, syllabusId } = context;

  try {
    // Step 1: Fetch syllabus
    const syllabus = await getSyllabus(syllabusId);
    if (!syllabus) {
      return { success: false, error: 'Syllabus not found' };
    }

    // Step 2: Create course record in DB with "generating" status
    const course = await createCourse(
      schoolId,
      studentId,
      syllabusId,
      syllabus.title,
      syllabus.description || '',
      'generating'
    );

    log.info(`Course generation started: ${course.id}`);

    try {
      // Step 3: Prepare student context for personalization
      const studentProfile = await getStudentProfile(studentId).catch(() => null);
      const studentContext = studentProfile
        ? {
            gradeLevel: studentProfile.gradeLevel,
            interests: studentProfile.interests,
          }
        : undefined;

      // Step 4: Scrape content from open.maic.chat
      const scrapingResult = await scrapeOpenMaicContent(
        syllabus.contentParsed,
        studentContext
      );

      if (!scrapingResult.success || !scrapingResult.html) {
        throw new Error(scrapingResult.error || 'Failed to scrape content');
      }

      log.info('Content scraped successfully');

      // Step 5: Save to filesystem
      const storageResult = await saveCourseContent(
        course.id,
        scrapingResult.html,
        scrapingResult.assets
      );

      if (!storageResult.success) {
        throw new Error(storageResult.error || 'Failed to save content');
      }

      // Step 6: Update course with success status and file path
      await updateCourseStatus(course.id, schoolId, {
        generationStatus: 'success',
        filePath: storageResult.filePath,
        fileSize: storageResult.fileSize,
        generatedAt: new Date(),
      });

      log.info(`Course generation completed: ${course.id}`);

      return {
        success: true,
        courseId: course.id,
      };
    } catch (generationError) {
      // If generation fails, update course with error status
      const errorMessage = generationError instanceof Error ? generationError.message : 'Unknown error';
      
      await updateCourseStatus(course.id, schoolId, {
        generationStatus: 'failed',
        errorMessage,
      }).catch((updateError) => {
        log.error('Failed to update course status:', updateError);
      });

      log.error(`Course generation failed: ${course.id}`, generationError);

      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Course generation orchestration error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Async wrapper for background processing
 * Call this from an async queue or background job handler
 */
export async function generateCourseAsync(context: GenerationContext): Promise<void> {
  try {
    await generateCourseFromSyllabus(context);
  } catch (error) {
    log.error('Async generation error:', error);
    // Error already logged in generateCourseFromSyllabus
  }
}
