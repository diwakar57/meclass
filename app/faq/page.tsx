import Link from 'next/link';

const faqs = [
  {
    q: 'Who can use LearnAI?',
    a: 'SaaS admins, principals, accountants, supervisors, teachers, and students each receive role-based dashboards and workflows.',
  },
  {
    q: 'Can students join schools independently?',
    a: 'Yes. Students sign up independently, discover schools, send join requests, and can be approved by school admins.',
  },
  {
    q: 'How is tenant isolation handled?',
    a: 'School-specific resources are separated through tenant-aware models and middleware checks to prevent cross-school data access.',
  },
  {
    q: 'What auth model is used?',
    a: 'The platform uses JWT-based sessions with refresh handling, role checks, protected routes, and secure cookie storage.',
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="mt-4 text-lg text-gray-600">
          Common questions about onboarding, roles, student lifecycle, and platform operations.
        </p>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <article key={faq.q} className="rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">{faq.q}</h2>
              <p className="mt-2 text-gray-600">{faq.a}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex gap-3">
          <Link href="/contact" className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700">
            Contact Team
          </Link>
          <Link href="/auth/signup" className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Create Account
          </Link>
        </div>

        <p className="mt-12 text-sm text-gray-500">Designed and operated by LearnAI.study</p>
      </section>
    </main>
  );
}
