import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock student portfolio data
    const portfolioData = {
      works: [
        {
          id: 'work-1',
          title: 'Historical Essay on Renaissance',
          subject: 'History',
          grade: 'A',
          score: 92,
          submissionDate: '2026-03-10',
          feedback: 'Excellent research and analysis. Great job!',
        },
        {
          id: 'work-2',
          title: 'Science Project: Water Cycle',
          subject: 'Science',
          grade: 'A-',
          score: 88,
          submissionDate: '2026-03-05',
          feedback: 'Good presentation and understanding. Minor areas for improvement.',
        },
        {
          id: 'work-3',
          title: 'Mathematics Problem Set',
          subject: 'Mathematics',
          grade: 'B+',
          score: 85,
          submissionDate: '2026-02-28',
          feedback: 'Solid work. Check your calculation methods.',
        },
        {
          id: 'work-4',
          title: 'English Literature Analysis',
          subject: 'English',
          grade: 'A',
          score: 90,
          submissionDate: '2026-02-20',
          feedback: 'Insightful interpretation and well-written.',
        },
      ],
      subjectDistribution: [
        { subject: 'Mathematics', count: 8 },
        { subject: 'Science', count: 7 },
        { subject: 'English', count: 6 },
        { subject: 'History', count: 5 },
        { subject: 'PE', count: 4 },
      ],
      strengths: ['Problem Solving', 'Research Skills', 'Written Communication', 'Analytical Thinking'],
      improvements: ['Time Management', 'Attention to Detail', 'Peer Collaboration'],
      avgGrade: 3.8,
      totalWorks: 30,
    };

    return NextResponse.json({ data: portfolioData });
  } catch (error) {
    console.error('Error fetching student portfolio:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
