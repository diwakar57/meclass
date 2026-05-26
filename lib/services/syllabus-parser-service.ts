/**
 * Syllabus Parser Service - Uses LLM to parse uploaded content
 * Converts PDF/text/form input into structured course format
 */

import { createLogger } from '@/lib/logger';
import { callLLM } from '@/lib/ai/llm';
import type { SyllabusParseResult, ParsedSyllabusContent, CreateSyllabusInput } from '@/lib/types/syllabi';

const log = createLogger('SyllabusParser');

/**
 * Parse syllabus content (PDF/text/form) into structured format
 * Uses LLM to extract chapters, topics, and learning objectives
 */
export async function parseSyllabusContent(
  input: CreateSyllabusInput
): Promise<SyllabusParseResult> {
  try {
    // Handle form-based input (already structured)
    if (input.format === 'form' && input.chapters) {
      const parsed = formToStructuredFormat(input);
      return { success: true, data: parsed };
    }

    // For PDF/text, use LLM to parse
    const contentText = await extractTextFromContent(input.content, input.format);
    if (!contentText || contentText.trim().length === 0) {
      return {
        success: false,
        error: 'Failed to extract text from content',
      };
    }

    // Build parsing prompt
    const prompt = buildParsingSyllabus(input.title, contentText);

    // Call LLM to parse structure
    const result = await callLLM(
      {
        model: 'default', // Uses server-configured default model
        system: PARSING_SYSTEM_PROMPT,
        prompt,
        temperature: 0.3, // Low temperature for consistency
        maxTokens: 4000,
      },
      'syllabus-parser'
    );

    // Parse LLM response
    const parsed = parseJsonResponse(result.text);
    if (!parsed || !Array.isArray(parsed.chapters)) {
      return {
        success: false,
        error: 'Invalid LLM response format',
      };
    }

    // Validate structure
    const validated = validateParsedStructure({
      title: input.title,
      description: input.title, // Use title as description if not provided
      chapters: parsed.chapters,
    });

    return { success: true, data: validated };
  } catch (error) {
    log.error('Error parsing syllabus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse syllabus',
    };
  }
}

/**
 * Extract text from PDF or text content
 */
async function extractTextFromContent(
  content: string | Buffer,
  format: 'pdf' | 'text' | 'form'
): Promise<string> {
  if (format === 'text') {
    return typeof content === 'string' ? content : content.toString('utf-8');
  }

  if (format === 'pdf') {
    // For PDF extraction, we would use a PDF parser library
    // For now, return a simplified version
    // In production, use pdf-parse or similar
    try {
      if (typeof content === 'string') {
        return content;
      }
      // Attempt basic text extraction (very basic, real implementation would use pdf-parse)
      const text = content.toString('utf-8', 0, Math.min(50000, content.length));
      return text.replace(/[^\w\s.,;:\-()]/g, '');
    } catch (error) {
      log.warn('PDF parsing failed, returning raw content');
      return typeof content === 'string' ? content : content.toString('utf-8');
    }
  }

  return '';
}

/**
 * Convert form-based input to structured format
 */
function formToStructuredFormat(input: CreateSyllabusInput): ParsedSyllabusContent {
  return {
    title: input.title,
    description: input.description,
    chapters: (input.chapters || []).map((chapter) => ({
      title: chapter.title,
      description: chapter.description,
      orderIndex: undefined,
      topics: (chapter.topics || []).map((topic, idx) => ({
        title: topic.title,
        description: topic.description,
        learningObjectives: topic.learningObjectives,
        orderIndex: idx,
      })),
    })),
  };
}

/**
 * Parse JSON from LLM response
 */
function parseJsonResponse(text: string): any {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try direct JSON parsing
    return JSON.parse(text);
  } catch {
    log.error('Failed to parse JSON response from LLM');
    return null;
  }
}

/**
 * Validate parsed structure before returning
 */
function validateParsedStructure(data: any): ParsedSyllabusContent {
  const validated: ParsedSyllabusContent = {
    title: data.title || 'Untitled Course',
    description: data.description || '',
    chapters: [],
  };

  if (Array.isArray(data.chapters)) {
    validated.chapters = data.chapters
      .filter((ch: any) => ch && ch.title)
      .map((chapter: any, chIdx: number) => ({
        title: chapter.title || `Chapter ${chIdx + 1}`,
        description: chapter.description || '',
        orderIndex: chIdx,
        topics: Array.isArray(chapter.topics)
          ? chapter.topics
              .filter((t: any) => t && t.title)
              .map((topic: any, tIdx: number) => ({
                title: topic.title,
                description: topic.description || '',
                learningObjectives: Array.isArray(topic.learningObjectives)
                  ? topic.learningObjectives.filter((o: string) => o && o.trim())
                  : [],
                orderIndex: tIdx,
              }))
          : [],
      }));
  }

  return validated;
}

/**
 * Build the parsing prompt for LLM
 */
function buildParsingSyllabus(title: string, contentText: string): string {
  return `You are a course content parser. Extract the following from this syllabus:
- Chapter/Unit names
- Topics within each chapter
- Learning objectives for each topic

Course Title: ${title}

Syllabus Content:
${contentText.substring(0, 3000)}

${contentText.length > 3000 ? '[Content truncated...]' : ''}

IMPORTANT: Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "chapters": [
    {
      "title": "Chapter Name",
      "description": "Short description",
      "topics": [
        {
          "title": "Topic Name",
          "description": "Topic description",
          "learningObjectives": ["Objective 1", "Objective 2"]
        }
      ]
    }
  ]
}

If you cannot parse the content into chapters/topics, create a reasonable structure with the main content as topics.`;
}

const PARSING_SYSTEM_PROMPT = `You are an expert course content parser. Your job is to:
1. Analyze syllabus documents (text, PDF excerpts, or form input)
2. Extract a hierarchical structure: Chapters → Topics → Learning Objectives
3. Return clean, well-organized JSON

Guidelines:
- Create 3-8 chapters per course
- Create 2-5 topics per chapter
- Create 2-4 clear learning objectives per topic
- Use action verbs: "Understand", "Apply", "Analyze", "Create"
- Keep titles concise (5-10 words max)
- Return ONLY valid JSON, no explanations

Always respond with valid JSON that matches the required format.`;
