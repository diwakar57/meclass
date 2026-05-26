import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCertificateToken, renderCertificateHTML } from "@/lib/certificate-utils";

/**
 * Display a certificate as HTML
 * Public endpoint - no authentication required
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: "Certificate token is required" },
        { status: 400 }
      );
    }

    // Verify the token
    const decoded = verifyCertificateToken(token);

    if (!decoded || !decoded.isValid) {
      return new NextResponse(
        renderErrorHtml("Invalid or expired certificate token"),
        {
          status: 401,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Fetch certificate and student data
    const [certificate, student, school] = await Promise.all([
      prisma.certificate.findUnique({
        where: { id: decoded.certificateId },
      }),
      prisma.user.findUnique({
        where: { id: decoded.studentId },
        include: { studentProfile: true },
      }),
      prisma.school.findUnique({
        where: { id: decoded.schoolId },
      }),
    ]);

    if (!certificate || !student || !school) {
      return new NextResponse(
        renderErrorHtml("Certificate data not found"),
        {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Verify school isolation
    if (certificate.schoolId !== decoded.schoolId || student.schoolId !== decoded.schoolId) {
      return new NextResponse(
        renderErrorHtml("Unauthorized certificate access"),
        {
          status: 401,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Render the certificate HTML
    const html = renderCertificateHTML(certificate, student, school.name, token);

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("GET /api/certificates/view/[token] error:", error);
    return new NextResponse(
      renderErrorHtml("Internal server error"),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

/**
 * Helper to render error HTML
 */
function renderErrorHtml(message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate Error</title>
  <style>
    body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .error { max-width: 600px; margin: 50px auto; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .error-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
    h1 { text-align: center; color: #d32f2f; margin: 0 0 10px 0; }
    p { text-align: center; color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="error">
    <div class="error-icon">⚠️</div>
    <h1>Certificate Not Found</h1>
    <p>${message}</p>
    <p style="margin-top: 30px; font-size: 12px; color: #999;">If you believe this is an error, please contact your school administrator.</p>
  </div>
</body>
</html>
  `;
}
