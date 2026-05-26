/**
 * Course Storage Service - Save generated course files to filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('CourseStorage');

const COURSES_BASE_DIR = 'public/courses';

interface StorageResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

/**
 * Save course HTML content to filesystem
 */
export async function saveCourseContent(
  courseId: string,
  html: string,
  assets?: { [key: string]: Buffer }
): Promise<StorageResult> {
  try {
    // Create course directory
    const courseDir = path.join(COURSES_BASE_DIR, courseId);
    await fs.mkdir(courseDir, { recursive: true });

    // Save HTML file
    const htmlFile = path.join(courseDir, 'index.html');
    await fs.writeFile(htmlFile, html, 'utf-8');

    const htmlStats = await fs.stat(htmlFile);
    const fileSize = htmlStats.size;

    log.info(`Course HTML saved: ${htmlFile} (${fileSize} bytes)`);

    // Save assets if provided
    if (assets && Object.keys(assets).length > 0) {
      const assetsDir = path.join(courseDir, 'assets');
      await fs.mkdir(assetsDir, { recursive: true });

      for (const [fileName, buffer] of Object.entries(assets)) {
        try {
          const safeFileName = sanitizeFileName(fileName);
          const assetPath = path.join(assetsDir, safeFileName);
          await fs.writeFile(assetPath, buffer);
          log.debug(`Asset saved: ${assetPath}`);
        } catch (error) {
          log.warn(`Failed to save asset ${fileName}:`, error);
          // Continue with other assets
        }
      }
    }

    return {
      success: true,
      filePath: `/courses/${courseId}/index.html`,
      fileSize,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Error saving course content:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Create downloadable zip from course files
 */
export async function createCourseZip(courseId: string): Promise<StorageResult> {
  try {
    // For now, we'll aggregate files into a single loadable bundle
    // In production, use archiver or similar to create actual ZIP
    const courseDir = path.join(COURSES_BASE_DIR, courseId);

    // Check if course exists
    const stats = await fs.stat(courseDir).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      return {
        success: false,
        error: 'Course directory not found',
      };
    }

    // For MVP, return path to the course directory
    // Students can download as HTML or we create a ZIP on demand
    const zipPath = path.join(COURSES_BASE_DIR, courseId, `${courseId}.zip`);

    log.info(`Course zip prepared: ${zipPath}`);

    return {
      success: true,
      filePath: zipPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Error creating course zip:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get course file content for download
 */
export async function getCourseFile(
  courseId: string,
  filePath?: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const fullPath = filePath
      ? path.join(COURSES_BASE_DIR, courseId, filePath)
      : path.join(COURSES_BASE_DIR, courseId, 'index.html');

    // Prevent directory traversal attacks
    const resolvedPath = path.resolve(fullPath);
    const basePath = path.resolve(path.join(COURSES_BASE_DIR, courseId));
    
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Invalid file path');
    }

    const buffer = await fs.readFile(resolvedPath);
    const mimeType = getMimeType(resolvedPath);

    return { buffer, mimeType };
  } catch (error) {
    log.error('Error reading course file:', error);
    return null;
  }
}

/**
 * Delete course files from filesystem
 */
export async function deleteCourseFiles(courseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const courseDir = path.join(COURSES_BASE_DIR, courseId);
    await fs.rm(courseDir, { recursive: true, force: true });
    log.info(`Course files deleted: ${courseDir}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Error deleting course files:', message);
    return { success: false, error: message };
  }
}

/**
 * Sanitize file name for security
 */
function sanitizeFileName(fileName: string): string {
  // Remove potentially dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get total size of course files
 */
export async function getCourseDirSize(courseId: string): Promise<number | null> {
  try {
    const courseDir = path.join(COURSES_BASE_DIR, courseId);
    let totalSize = 0;

    const getAllFiles = async (dir: string): Promise<void> => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          await getAllFiles(filePath);
        }
      }
    };

    await getAllFiles(courseDir);
    return totalSize;
  } catch (error) {
    log.error('Error calculating course size:', error);
    return null;
  }
}
