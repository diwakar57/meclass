import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { workId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workId } = params;

    // Mock: Generate work file for download
    // In production, this would fetch and stream actual file
    const fileContent = `Student Work - ${workId}\n\nSubmitted on ${new Date().toISOString()}`;
    const buffer = Buffer.from(fileContent);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="work-${workId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error downloading work:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
