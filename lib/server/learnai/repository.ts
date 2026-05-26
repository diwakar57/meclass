import { DEMO_LEARNAI_DATA } from '@/lib/server/learnai/demo-data';
import type {
  LearnAIPlatformData,
  LearnAIRole,
  Role,
  Syllabus,
  Topic,
  User,
} from '@/lib/types/learnai-school';

export class LearnAIRepository {
  private readonly data: LearnAIPlatformData;

  constructor(data: LearnAIPlatformData = DEMO_LEARNAI_DATA) {
    this.data = data;
  }

  getBootstrapData(): LearnAIPlatformData {
    return this.data;
  }

  getRoleByKey(role: LearnAIRole): Role | undefined {
    return this.data.roles.find((item) => item.key === role);
  }

  getUserById(userId: string): User | undefined {
    return this.data.users.find((item) => item.id === userId);
  }

  getSyllabusById(syllabusId: string): Syllabus | undefined {
    return this.data.syllabi.find((item) => item.id === syllabusId);
  }

  getTopicsBySyllabusId(syllabusId: string): Topic[] {
    const unitIds = this.data.syllabusUnits
      .filter((unit) => unit.syllabusId === syllabusId)
      .map((unit) => unit.id);

    return this.data.topics.filter((topic) => unitIds.includes(topic.syllabusUnitId));
  }
}
