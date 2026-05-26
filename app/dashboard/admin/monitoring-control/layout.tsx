// Server Component Layout - prevents prerendering of monitoring control pages
export const dynamic = 'force-dynamic';

export default function MonitoringControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
