import { redirect } from 'next/navigation';

export default function StudentSettingsRedirectPage() {
  redirect('/dashboard/student/profile');
}
