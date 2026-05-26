'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Menu, X, ArrowLeft, Loader2, Check } from 'lucide-react';

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationResult, setRegistrationResult] = useState<{ schoolCode?: string; schoolDomain?: string } | null>(null);

  const [formData, setFormData] = useState({
    schoolName: '',
    country: '',
    state: '',
    city: '',
    principalFirstName: '',
    principalLastName: '',
    principalEmail: '',
    schoolType: 'high-school',
    studentCount: '',
    phone: '',
    website: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return false;
    }
    if (!formData.country.trim()) {
      setError('Country is required');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!formData.principalFirstName.trim() || !formData.principalLastName.trim()) {
      setError('Principal name is required');
      return false;
    }
    if (!formData.principalEmail.trim()) {
      setError('Principal email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.principalEmail)) {
      setError('Invalid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      const data = await response.json();
      setRegistrationResult({
        schoolCode: data.schoolCode,
        schoolDomain: data.schoolDomain,
      });

      setSubmitted(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Main Content */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Register Your School</h1>
              <p className="text-xl text-gray-600">
                Get your school set up on LearnAI. Our team will help you get started.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`h-2 flex-1 rounded-full transition ${
                    step >= 1 ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
                <div
                  className={`h-2 flex-1 rounded-full transition ${
                    step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
                <div
                  className={`h-2 flex-1 rounded-full transition ${
                    step >= 3 ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Step {step} of 3
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Step 1: School Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">School Information</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Central High School"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School Type *
                    </label>
                    <select
                      name="schoolType"
                      value={formData.schoolType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="primary-school">Primary School</option>
                      <option value="middle-school">Middle School</option>
                      <option value="high-school">High School</option>
                      <option value="university">University</option>
                      <option value="vocational">Vocational</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student Count *
                    </label>
                    <select
                      name="studentCount"
                      value={formData.studentCount}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="0-100">0 - 100</option>
                      <option value="100-500">100 - 500</option>
                      <option value="500-1000">500 - 1,000</option>
                      <option value="1000-5000">1,000 - 5,000</option>
                      <option value="5000+">5,000+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Indonesia"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jakarta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jakarta Selatan"
                    />
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Next: Principal Information
                </button>
              </div>
            )}

            {/* Step 2: Principal Info */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Principal Information</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="principalFirstName"
                      value={formData.principalFirstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="principalLastName"
                      value={formData.principalLastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="principalEmail"
                    value={formData.principalEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@school.edu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 0123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://school.edu"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Next: Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Review Your Information</h2>

                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">School Name</p>
                    <p className="font-semibold text-gray-900">{formData.schoolName}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600">School Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.schoolType.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Student Count</p>
                      <p className="font-semibold text-gray-900">{formData.studentCount}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold text-gray-900">
                      {[formData.city, formData.state, formData.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold text-gray-900">Principal Contact</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-semibold text-gray-900">
                        {formData.principalFirstName} {formData.principalLastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{formData.principalEmail}</p>
                    </div>
                  </div>
                  {formData.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold text-gray-900">{formData.phone}</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    After submitting, your school workspace is created and your invite code can be used for principal and teacher onboarding.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Submitting...' : 'Submit Registration'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Success Message */
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Application Submitted!</h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Thank you for registering your school. Share the details below with your team to begin onboarding.
            </p>
            {registrationResult?.schoolCode && (
              <div className="mx-auto max-w-md rounded-lg border border-green-200 bg-green-50 p-4 text-left">
                <p className="text-sm text-green-800"><strong>School Invite Code:</strong> {registrationResult.schoolCode}</p>
                {registrationResult.schoolDomain && (
                  <p className="mt-1 text-sm text-green-800"><strong>School Domain:</strong> {registrationResult.schoolDomain}</p>
                )}
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-left">
              <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">1</span>
                  <span>Use the invite code in teacher and principal signup</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">2</span>
                  <span>Share school domain or invite code with your staff</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-1">3</span>
                  <span>Start managing your school on LearnAI</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Return to Home
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
