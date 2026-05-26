// Server Component Layout - prevents prerendering of student schools page
export const dynamic = 'force-dynamic';

export default function StudentSchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
