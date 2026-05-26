import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900">Platform Features</h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-600">
          LearnAI delivers a complete AI-powered school platform for SaaS operators, school teams,
          and students with tenant isolation, secure role-based access, and personalized learning.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">SaaS Layer</h2>
            <p className="mt-2 text-gray-600">
              School onboarding, approval workflows, subscription controls, platform analytics,
              and operational governance.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">School Layer</h2>
            <p className="mt-2 text-gray-600">
              Principal, supervisor, accountant, and teacher workspaces with scoped permissions,
              class management, and student lifecycle workflows.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">Student Layer</h2>
            <p className="mt-2 text-gray-600">
              Independent student identity, school discovery, join requests, AI lesson generation,
              quiz progress, and adaptive learning journey support.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">Security and Reliability</h2>
            <p className="mt-2 text-gray-600">
              JWT session model, role-gated middleware, protected routes, and tenant-aware data
              boundaries for production-grade SaaS operations.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/auth/signup" className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700">
            Sign Up
          </Link>
          <Link href="/auth/login" className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Login
          </Link>
        </div>

        <p className="mt-12 text-sm text-gray-500">Designed and operated by LearnAI.study</p>
      </section>
    </main>
  );
}
