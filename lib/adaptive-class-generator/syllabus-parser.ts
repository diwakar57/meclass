import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import type {
  SyllabusModel,
  SyllabusModule,
  SyllabusTopic,
  TeacherSyllabusInput,
} from '@/lib/adaptive-class-generator/types';

function clampWeight(weight?: number): number {
  if (typeof weight !== 'number' || Number.isNaN(weight)) return 1;
  return Math.min(5, Math.max(0.5, weight));
}

function normalizePriority(value?: string): 'low' | 'medium' | 'high' {
  const normalized = (value || '').toLowerCase().trim();
  if (normalized === 'low') return 'low';
  if (normalized === 'high') return 'high';
  return 'medium';
}

function normalizeDifficulty(value?: string): 'low' | 'medium' | 'high' {
  const normalized = (value || '').toLowerCase().trim();
  if (normalized === 'low' || normalized === 'easy') return 'low';
  if (normalized === 'high' || normalized === 'hard') return 'high';
  return 'medium';
}

function normalizePrerequisites(raw?: string[]): string[] {
  if (!raw) return [];
  return [...new Set(raw.map((item) => item.trim()).filter(Boolean))];
}

function buildVersionHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function stripInlineTags(line: string): string {
  return line
    .replace(/\[(priority|difficulty|weight)\s*[:=]\s*[^\]]+\]/gi, '')
    .replace(/\((priority|difficulty|weight)\s*[:=]\s*[^\)]+\)/gi, '')
    .trim();
}

function extractInlineTag(line: string, key: 'priority' | 'difficulty' | 'weight'): string | undefined {
  const match = line.match(new RegExp(`${key}\\s*[:=]\\s*([a-z0-9.]+)`, 'i'));
  if (!match) return undefined;
  return match[1];
}

function toTopic(topic: Partial<SyllabusTopic> & { topicName: string }): SyllabusTopic {
  return {
    id: topic.id || `topic_${nanoid(8)}`,
    topicName: topic.topicName.trim(),
    subtopics: [...new Set((topic.subtopics || []).map((item) => item.trim()).filter(Boolean))],
    objectives: [...new Set((topic.objectives || []).map((item) => item.trim()).filter(Boolean))],
    prerequisites: normalizePrerequisites(topic.prerequisites),
    weight: clampWeight(topic.weight),
    priority: topic.priority || 'medium',
    difficultyTag: topic.difficultyTag || 'medium',
  };
}

function toModule(module: Partial<SyllabusModule> & { moduleName: string; topics: SyllabusTopic[] }): SyllabusModule {
  return {
    id: module.id || `module_${nanoid(8)}`,
    moduleName: module.moduleName.trim(),
    topics: module.topics,
  };
}

function normalizeStructuredInput(input: TeacherSyllabusInput): SyllabusModel {
  const structured = input.structured;
  const modules = (structured?.modules || [])
    .map((module) => {
      const topics = (module.topics || [])
        .map((topic) =>
          toTopic({
            topicName: topic.topicName,
            subtopics: topic.subtopics,
            objectives: topic.objectives,
            prerequisites: topic.prerequisites,
            weight: topic.weight,
            priority: normalizePriority(topic.priority),
            difficultyTag: normalizeDifficulty(topic.difficultyTag),
          }),
        )
        .filter((topic) => topic.topicName.length > 0);

      if (topics.length === 0) return null;

      return toModule({
        moduleName: module.moduleName,
        topics,
      });
    })
    .filter((module): module is SyllabusModule => module !== null);

  if (modules.length === 0) {
    throw new Error('Structured syllabus must contain at least one module with topics.');
  }

  const payload = {
    subjectName: structured?.subjectName || input.subjectNameHint || 'General Subject',
    modules,
  };

  return {
    id: structured?.id || input.syllabusId || `syllabus_${nanoid(10)}`,
    teacherId: structured?.teacherId || input.teacherId,
    subjectName: payload.subjectName,
    modules,
    sourceType: 'structured',
    versionHash: buildVersionHash(payload),
  };
}

function parseUnstructuredText(input: TeacherSyllabusInput): SyllabusModel {
  const rawText = (input.rawText || '').trim();
  if (!rawText) {
    throw new Error('Syllabus text is required when structured syllabus is not provided.');
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let subjectName = input.subjectNameHint || 'General Subject';
  const modules: SyllabusModule[] = [];
  let currentModule: SyllabusModule | null = null;
  let currentTopic: SyllabusTopic | null = null;

  const pushTopicIfNeeded = () => {
    if (!currentTopic) return;
    if (!currentTopic.topicName.trim()) return;
    if (!currentModule) {
      currentModule = toModule({ moduleName: 'Module 1', topics: [] });
      modules.push(currentModule);
    }
    currentModule.topics.push(toTopic(currentTopic));
    currentTopic = null;
  };

  const pushModuleIfNeeded = () => {
    if (!currentModule) return;
    if (currentModule.topics.length === 0) return;
    currentModule = null;
  };

  for (const line of lines) {
    const subjectMatch = line.match(/^subject\s*:\s*(.+)$/i);
    if (subjectMatch) {
      subjectName = subjectMatch[1].trim();
      continue;
    }

    const moduleMatch = line.match(/^(?:unit|module|chapter)\s*[0-9a-zA-Z.-]*\s*[:\-]?\s*(.+)$/i);
    if (moduleMatch) {
      pushTopicIfNeeded();
      pushModuleIfNeeded();
      currentModule = toModule({
        moduleName: stripInlineTags(moduleMatch[1]),
        topics: [],
      });
      modules.push(currentModule);
      continue;
    }

    const topicMatch = line.match(/^(?:topic|lesson)\s*[0-9a-zA-Z.-]*\s*[:\-]?\s*(.+)$/i);
    if (topicMatch) {
      pushTopicIfNeeded();
      if (!currentModule) {
        currentModule = toModule({ moduleName: 'Module 1', topics: [] });
        modules.push(currentModule);
      }
      currentTopic = {
        id: `topic_${nanoid(8)}`,
        topicName: stripInlineTags(topicMatch[1]),
        subtopics: [],
        objectives: [],
        prerequisites: [],
        weight: Number(extractInlineTag(topicMatch[1], 'weight')) || 1,
        priority: normalizePriority(extractInlineTag(topicMatch[1], 'priority')),
        difficultyTag: normalizeDifficulty(extractInlineTag(topicMatch[1], 'difficulty')),
      };
      continue;
    }

    const objectiveMatch = line.match(/^(?:objective|learning objective|outcome|lo)s?\s*[:\-]\s*(.+)$/i);
    if (objectiveMatch && currentTopic) {
      currentTopic.objectives = [...(currentTopic.objectives || []), stripInlineTags(objectiveMatch[1])];
      continue;
    }

    const subtopicMatch = line.match(/^(?:subtopic|sub-topic)\s*[0-9a-zA-Z.-]*\s*[:\-]?\s*(.+)$/i);
    if (subtopicMatch && currentTopic) {
      currentTopic.subtopics = [...(currentTopic.subtopics || []), stripInlineTags(subtopicMatch[1])];
      continue;
    }

    const prereqMatch = line.match(/^(?:prereq|prerequisite)s?\s*[:\-]\s*(.+)$/i);
    if (prereqMatch && currentTopic) {
      const prerequisites = prereqMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      currentTopic.prerequisites = [...(currentTopic.prerequisites || []), ...prerequisites];
      continue;
    }

    if ((line.startsWith('-') || line.startsWith('*')) && currentTopic) {
      const bulletText = stripInlineTags(line.replace(/^[-*]\s*/, '').trim());
      if (/^(objective|learning objective|outcome|lo)\b/i.test(bulletText)) {
        currentTopic.objectives = [
          ...(currentTopic.objectives || []),
          bulletText.replace(/^(objective|learning objective|outcome|lo)\s*[:\-]?\s*/i, ''),
        ];
      } else {
        currentTopic.subtopics = [...(currentTopic.subtopics || []), bulletText];
      }
      continue;
    }

    if (!currentModule) {
      currentModule = toModule({ moduleName: 'Module 1', topics: [] });
      modules.push(currentModule);
    }

    if (!currentTopic) {
      currentTopic = {
        id: `topic_${nanoid(8)}`,
        topicName: stripInlineTags(line),
        subtopics: [],
        objectives: [],
        prerequisites: [],
        weight: 1,
        priority: 'medium',
        difficultyTag: 'medium',
      };
    } else {
      currentTopic.subtopics = [...(currentTopic.subtopics || []), stripInlineTags(line)];
    }
  }

  pushTopicIfNeeded();

  const sanitizedModules = modules
    .map((module) =>
      toModule({
        id: module.id,
        moduleName: module.moduleName,
        topics: module.topics.filter((topic) => topic.topicName.trim().length > 0),
      }),
    )
    .filter((module) => module.topics.length > 0);

  if (sanitizedModules.length === 0) {
    throw new Error('Unable to parse syllabus into structured modules and topics.');
  }

  const payload = { subjectName, modules: sanitizedModules };

  return {
    id: input.syllabusId || `syllabus_${nanoid(10)}`,
    teacherId: input.teacherId,
    subjectName,
    modules: sanitizedModules,
    sourceType: input.sourceType === 'pdf' ? 'pdf' : 'text',
    versionHash: buildVersionHash(payload),
  };
}

export function normalizeSyllabus(input: TeacherSyllabusInput): SyllabusModel {
  if (input.structured?.modules?.length) {
    return normalizeStructuredInput(input);
  }

  return parseUnstructuredText(input);
}

export function flattenTopics(syllabus: SyllabusModel): SyllabusTopic[] {
  return syllabus.modules.flatMap((module) => module.topics);
}
