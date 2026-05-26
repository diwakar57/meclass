// Server Component Layout - prevents prerendering of parent monitoring pages
export const dynamic = 'force-dynamic';

export default function ParentMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
