'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Users,
  Target,
  Heart,
  Lightbulb,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

export default function AboutPage() {
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
            <Link href="/about" className="text-blue-600 font-medium">
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
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Sign Up
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
            <Link href="/about" className="text-blue-600 font-medium">
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
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Sign Up
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Our Story: Transforming Education
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            LearnAI was born from a simple belief: every student deserves personalized education,
            and every teacher deserves tools that empower them to deliver it.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-12 text-white">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Schools Using LearnAI</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Students Impacted</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2.3x</div>
              <div className="text-blue-100">Average Learning Improvement</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="bg-gray-50 py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                We believe that education should be personalized, not standardized. In a world
                where every student learns differently, one-size-fits-all instruction is
                fundamentally unfair.
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                LearnAI leverages artificial intelligence to give every teacher the ability to
                create personalized learning experiences at scale. We free teachers from
                administrative burden so they can focus on what matters most: inspiring and
                supporting each student.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-blue-600">
              <Target className="w-12 h-12 text-blue-600 mb-4" />
              <p className="text-xl font-bold text-gray-900 mb-4">Our Commitment</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">✓</span>
                  <span className="text-gray-700">Democratize AI-powered education</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">✓</span>
                  <span className="text-gray-700">Protect student data and privacy</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">✓</span>
                  <span className="text-gray-700">Empower teachers with technology</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">✓</span>
                  <span className="text-gray-700">Support all types of institutions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <h2 className="text-4xl font-bold text-gray-900 mb-12">Our Vision</h2>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="p-8 bg-blue-50 rounded-xl border border-blue-200">
            <Lightbulb className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Intelligent Learning</h3>
            <p className="text-gray-700">
              Every lesson adapts to each student's pace, learning style, and mastery level. By
              2030, every classroom will have personalized instruction powered by AI.
            </p>
          </div>

          <div className="p-8 bg-purple-50 rounded-xl border border-purple-200">
            <Globe className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Global Impact</h3>
            <p className="text-gray-700">
              We're building the education infrastructure for emerging markets. Language barriers
              won't limit access to quality education.
            </p>
          </div>

          <div className="p-8 bg-green-50 rounded-xl border border-green-200">
            <Heart className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Equity & Access</h3>
            <p className="text-gray-700">
              Education should not be a privilege of the wealthy. We're committed to affordable,
              accessible AI tools for all schools.
            </p>
          </div>

          <div className="p-8 bg-orange-50 rounded-xl border border-orange-200">
            <Users className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Teacher Empowerment</h3>
            <p className="text-gray-700">
              Teachers are the heart of education. We create tools that enhance, not replace,
              teacher expertise and judgment.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-gray-900 text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-12">Our Core Values</h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                title: 'Innovation',
                description: 'We embrace cutting-edge technology to solve education challenges.',
              },
              {
                title: 'Integrity',
                description: 'We protect student data and operate with complete transparency.',
              },
              {
                title: 'Inclusion',
                description: 'We build for all students, teachers, and schools regardless of size.',
              },
              {
                title: 'Impact',
                description: 'We measure success by student outcomes, not vanity metrics.',
              },
            ].map((value, idx) => (
              <div key={idx} className="p-6 bg-gray-800 rounded-xl">
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-gray-300">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Our Journey</h2>

        <div className="space-y-8 max-w-3xl mx-auto">
          {[
            {
              year: '2023',
              title: 'The Beginning',
              description:
                'LearnAI started as a research project in partnership with 5 schools in South Asia.',
            },
            {
              year: '2024',
              title: 'Early Success',
              description:
                'Expanded to 50+ schools across 8 countries. Launched enterprise features and multi-language support.',
            },
            {
              year: '2025',
              title: 'Scaling Impact',
              description:
                'Reached 10,000+ students. Integrated with major education platforms and added advanced analytics.',
            },
            {
              year: '2026',
              title: 'Our Vision Unfolds',
              description:
                'Now we\'re building the global AI education platform that every school can afford and trust.',
            },
          ].map((milestone, idx) => (
            <div key={idx} className="flex gap-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-4">
                  {idx + 1}
                </div>
                {idx < 3 && <div className="w-1 h-20 bg-blue-200" />}
              </div>
              <div className="pb-8">
                <div className="text-sm font-bold text-blue-600 mb-2">{milestone.year}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{milestone.title}</h3>
                <p className="text-gray-600">{milestone.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Preview */}
      <section className="bg-gray-50 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Backed by Experts</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Dr. Anil Patel',
                role: 'Founder & CEO',
                bio: 'Former AI researcher at Stanford. 15+ years in education technology.',
              },
              {
                name: 'Maria Garcia',
                role: 'Head of Product',
                bio: 'Built products at impact companies. Passionate about education equity.',
              },
              {
                name: 'James Chen',
                role: 'Chief Technology Officer',
                bio: 'ML engineer. Previously led AI initiatives at Microsoft Education.',
              },
            ].map((member, idx) => (
              <div key={idx} className="text-center p-6 bg-white rounded-xl border border-gray-200">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Join Us in Transforming Education</h2>
          <p className="text-xl text-blue-100 mb-8">
            Whether you're a teacher, principal, or education innovator, there's a place for you in
            our mission.
          </p>
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-bold flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/contact')}
              className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition font-bold"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
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
                  <Link href="/contact" className="hover:text-white transition">
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
          </div>
        </div>
      </footer>
    </div>
  );
}
