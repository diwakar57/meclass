import { redirect } from 'next/navigation';

export default function TeacherClassNewRedirectPage() {
  redirect('/dashboard/teacher/classes');
}
