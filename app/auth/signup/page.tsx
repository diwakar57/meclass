'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Menu, X, ArrowRight, GraduationCap, Briefcase, Users } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 font-bold text-2xl text-blue-600 hover:text-blue-700"
          >
            <BookOpen className="w-6 h-6" />
            LearnAI
          </button>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition">
              Home
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600 transition">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition">
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex gap-4 items-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white p-4 flex flex-col gap-4">
            <Link href="/" className="text-gray-700 hover:text-blue-600">
              Home
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600">
              Contact
            </Link>
            <button
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 font-medium"
            >
              Login
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">Get Started Now</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose your role to create your LearnAI account and begin your journey in personalized education.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Student Card */}
          <div className="flex flex-col p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Student</h2>
            <p className="text-gray-700 mb-6 flex-grow">
              Join LearnAI to access personalized learning, track your progress, and achieve your academic goals.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Personalized learning paths</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Progress tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Interactive assignments</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/auth/signup/student')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
            >
              Sign Up as Student <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Teacher Card */}
          <div className="flex flex-col p-8 bg-gradient-to-br from-green-50 to-teal-100 rounded-2xl border-2 border-green-200 hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center mb-6">
              <Briefcase className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Teacher</h2>
            <p className="text-gray-700 mb-6 flex-grow">
              Generate AI-powered lessons, manage your classes, and empower your students with personalized education.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>AI lesson generation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Class management tools</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Student analytics</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/auth/signup/teacher')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
            >
              Sign Up as Teacher <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Principal Card */}
          <div className="flex flex-col p-8 bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl border-2 border-orange-200 hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Principal</h2>
            <p className="text-gray-700 mb-6 flex-grow">
              Administer your entire school, manage staff, oversee student learning, and drive educational transformation.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-orange-600">✓</span>
                <span>School administration</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-600">✓</span>
                <span>Staff management</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-600">✓</span>
                <span>School-wide analytics</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/auth/signup/principal')}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium flex items-center justify-center gap-2"
            >
              Sign Up as Principal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 p-8 bg-blue-50 rounded-xl border border-blue-200 max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Not sure which role fits you?</h3>
          <p className="text-gray-700 mb-4">
            <span className="font-semibold">Students:</span> Sign up to join a school or class. You can explore and join schools after creating your account.
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Teachers & Principals:</span> You'll need a school code from your institution to sign up. This code connects you to your school's account and ensures proper verification.
          </p>
        </div>
      </section>

      {/* Already Have Account */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center border-t">
        <p className="text-gray-600 text-lg">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/auth/login')}
            className="text-blue-600 hover:text-blue-700 font-bold"
          >
            Log in here
          </button>
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-white mb-4">
                <BookOpen className="w-5 h-5" />
                LearnAI
              </div>
              <p className="text-sm">Transforming education with AI</p>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-white transition">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-sm">
              &copy; 2026 LearnAI. All rights reserved. Empowering education through AI.
            </p>
            <p className="mt-2 text-center text-xs text-gray-400">Designed and operated by LearnAI.study</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
