import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCertificateToken, renderCertificateHTML } from "@/lib/certificate-utils";

/**
 * Verify and display a certificate using secure token
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
      return NextResponse.json(
        { error: "Invalid or expired certificate token" },
        { status: 401 }
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
      return NextResponse.json(
        { error: "Certificate data not found" },
        { status: 404 }
      );
    }

    // Verify school isolation
    if (certificate.schoolId !== decoded.schoolId || student.schoolId !== decoded.schoolId) {
      return NextResponse.json(
        { error: "School context mismatch" },
        { status: 401 }
      );
    }

    // Return certificate data
    return NextResponse.json({
      success: true,
      data: {
        certificate: {
          id: certificate.id,
          name: certificate.name,
          description: certificate.description,
        },
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          gradeLevel: student.studentProfile?.gradeLevel,
        },
        school: {
          id: school.id,
          name: school.name,
        },
        verified: true,
      },
    });
  } catch (error) {
    console.error("GET /api/certificates/verify/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
