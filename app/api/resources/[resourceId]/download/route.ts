import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { resourceId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resourceId } = params;

    // Mock: Download resource file
    const fileContent = `Resource - ${resourceId}\n\nDownloaded on ${new Date().toISOString()}`;
    const buffer = Buffer.from(fileContent);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resource-${resourceId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error downloading resource:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
