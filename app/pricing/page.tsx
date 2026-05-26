import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    note: 'Ideal for pilots and small teams',
    features: ['Up to 50 students', 'Core dashboards', 'Basic AI generation'],
  },
  {
    name: 'Professional',
    price: '$299 / month',
    note: 'Best for active schools',
    features: ['Up to 500 students', 'Advanced analytics', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    note: 'For district-scale deployments',
    features: ['Unlimited seats', 'Custom integrations', 'Dedicated success'],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900">Simple SaaS Pricing</h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-600">
          Choose a plan that matches your school growth stage. Upgrade as your team and learners scale.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold text-blue-600">{plan.price}</p>
              <p className="mt-2 text-sm text-gray-500">{plan.note}</p>
              <ul className="mt-5 space-y-2 text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/register-school" className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700">
            Register School
          </Link>
          <Link href="/contact" className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Request Demo
          </Link>
        </div>

        <p className="mt-12 text-sm text-gray-500">Designed and operated by LearnAI.study</p>
      </section>
    </main>
  );
}
