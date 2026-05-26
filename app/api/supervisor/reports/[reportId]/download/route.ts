import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = params;

    // Mock: Generate PDF report
    // In production, this would generate actual PDF and stream it
    const reportContent = `Supervisor Report - ${reportId}\n\nGenerated on ${new Date().toISOString()}`;
    const buffer = Buffer.from(reportContent);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${reportId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
