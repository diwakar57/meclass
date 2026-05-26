import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'recent';

    // Mock resources data
    const resourcesData = {
      categories: [
        { name: 'Mathematics', count: 45 },
        { name: 'Science', count: 38 },
        { name: 'English', count: 32 },
        { name: 'History', count: 25 },
      ],
      resources: Array(30)
        .fill(null)
        .map((_, i) => ({
          id: `resource-${i}`,
          title: `Resource ${i + 1}`,
          description: `Description of resource ${i + 1}`,
          subject: ['Mathematics', 'Science', 'English', 'History'][i % 4],
          type: ['pdf', 'video', 'presentation', 'document', 'link'][i % 5],
          url: `https://example.com/resource-${i}`,
          fileSize: `${Math.random() * 10}MB`,
          uploadedBy: `Teacher ${Math.floor(Math.random() * 20)}`,
          uploadedDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          downloads: Math.floor(Math.random() * 500),
          views: Math.floor(Math.random() * 1000),
          gradeLevel: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'][i % 4],
          tags: ['important', 'recent', 'popular'][Math.floor(Math.random() * 3)],
        })),
      recentResources: Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `recent-${i}`,
          title: `Recent Resource ${i + 1}`,
          description: `Recent resource description`,
          subject: ['Mathematics', 'Science', 'English'][i % 3],
          type: ['pdf', 'video', 'presentation'][i % 3],
          uploadedBy: `Teacher A`,
          uploadedDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          downloads: Math.floor(Math.random() * 100),
          views: Math.floor(Math.random() * 300),
        })),
      popularResources: Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `popular-${i}`,
          title: `Popular Resource ${i + 1}`,
          description: `Popular resource description`,
          subject: ['Mathematics', 'Science', 'English'][i % 3],
          type: ['pdf', 'video', 'document'][i % 3],
          uploadedBy: `Teacher B`,
          uploadedDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          downloads: 500 + Math.random() * 1000,
          views: 1000 + Math.random() * 2000,
        })),
      stats: {
        totalResources: 450,
        totalDownloads: 12500,
        averageRating: 4.5,
      },
    };

    return NextResponse.json({ data: resourcesData });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
