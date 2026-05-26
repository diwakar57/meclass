import { redirect } from 'next/navigation';

export default function StudentRegistrationPage() {
  redirect('/auth/signup/student');
}
