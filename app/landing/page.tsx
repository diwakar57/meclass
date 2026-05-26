'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Users,
  BookOpen,
  Brain,
  Lock,
  Menu,
  X,
} from 'lucide-react';

// ==================== HERO SECTION ====================
function HeroSection() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const router = useRouter();

  const stats = [
    { number: '109', label: 'Languages' },
    { number: '212+', label: 'APIs' },
    { number: '9', label: 'User Roles' },
    { number: '∞', label: 'Possibilities' },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-20">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl opacity-50" />
        <motion.div
          animate={{ y: scrollY * 0.5 }}
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Pre-headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-6"
        >
          <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium text-blue-300">
            The AI-Native School Operating System
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-6xl sm:text-7xl lg:text-8xl font-black mb-6 leading-tight"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-blue-400">
            Education<br />Is Being Rebuilt
          </span>
          <br />
          <span className="text-white">From Scratch With AI</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto mb-12"
        >
          LearnAI transforms static classrooms into adaptive AI-powered learning ecosystems where every student, teacher, parent, and school thrives.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <button
            onClick={() => router.push('/auth/signup')}
            className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
          >
            Request Demo
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
          >
            Explore Platform
          </button>
        </motion.div>

        {/* Animated Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-12 border-t border-white/10"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="text-3xl sm:text-4xl font-black text-blue-400 group-hover:text-blue-300 transition-colors">
                {stat.number}
              </div>
              <div className="text-xs sm:text-sm text-gray-400 mt-2 group-hover:text-gray-300 transition-colors">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ==================== THE PROBLEM SECTION ====================
function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <section ref={ref} className="relative min-h-screen bg-black py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-10 w-72 h-72 bg-red-600 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Main Headline */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="mb-20 text-center"
        >
          <h2 className="text-5xl sm:text-7xl font-black leading-tight mb-8">
            <motion.span
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 1 }}
              className="text-white"
            >
              For 100 years,
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400"
            >
              Classrooms Changed Very Little.
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 1 }}
              className="text-gray-400"
            >
              Students Did.
            </motion.span>
          </h2>
        </motion.div>

        {/* Problem Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'One-Size-Fits-All Learning',
              desc: 'Students with vastly different learning styles forced into identical curricula',
            },
            {
              title: 'Teacher Overwhelm',
              desc: 'Educators juggling 150+ students with no tools to personalize instruction',
            },
            {
              title: 'Invisible Struggles',
              desc: 'Learning gaps noticed too late. Potential lost before intervention.',
            },
          ].map((problem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.8 }}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-red-500/50 hover:bg-white/10 transition-all duration-300"
            >
              <h3 className="text-2xl font-bold text-white mb-3">{problem.title}</h3>
              <p className="text-gray-400">{problem.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== THE VISION SECTION ====================
function VisionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const learningTypes = [
    { icon: '👁️', title: 'Visual', desc: 'Diagrams, infographics, spatial reasoning' },
    { icon: '🎵', title: 'Auditory', desc: 'Lectures, discussions, audio explanations' },
    { icon: '✍️', title: 'Kinesthetic', desc: 'Hands-on projects, interactive simulations' },
    { icon: '📖', title: 'Reading/Writing', desc: 'Texts, notes, written analysis' },
  ];

  return (
    <section ref={ref} className="relative min-h-screen bg-gradient-to-b from-black to-blue-950/30 py-20 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl sm:text-7xl font-black mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
              An Education System<br />That Adapts To Humans
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Introducing <span className="font-bold">Learning DNA™</span> — AI that recognizes how each student learns best and adapts in real-time.
          </p>
        </motion.div>

        {/* Learning Types Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          {learningTypes.map((type, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.05 }}
              className="p-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="text-5xl mb-3 group-hover:scale-125 transition-transform">
                {type.icon}
              </div>
              <h3 className="font-bold text-white mb-2">{type.title}</h3>
              <p className="text-sm text-gray-400">{type.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Neural Network Visualization */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 1 }}
          className="relative h-96 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 overflow-hidden flex items-center justify-center"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-full opacity-30" viewBox="0 0 400 300">
              {/* Neural Network Visualization */}
              {[0, 1, 2, 3, 4].map((i) => (
                <circle key={`n${i}`} cx={50 + i * 70} cy={150} r="8" fill="#3b82f6" />
              ))}
              {[0, 1, 2].map((i) => (
                <circle key={`m${i}`} cx={100 + i * 100} cy={80} r="8" fill="#8b5cf6" />
              ))}
              {[0, 1, 2].map((i) => (
                <circle key={`o${i}`} cx={100 + i * 100} cy={220} r="8" fill="#ec4899" />
              ))}
              {/* Connecting lines */}
              <line x1="50" y1="150" x2="100" y2="80" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
              <line x1="120" y1="150" x2="100" y2="220" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
          <div className="relative z-10 text-center">
            <p className="text-white font-semibold">Adaptive Learning Intelligence</p>
            <p className="text-gray-400 text-sm">Real-time personalization engine</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ==================== AI CLASSROOM EXPERIENCE ====================
function AIClassroomSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const features = [
    { icon: '🤖', title: 'Multi-Agent Instructors', desc: 'Specialized AI tutors for each subject' },
    { icon: '⚡', title: 'Live Adaptation', desc: 'Content adjusts difficulty in real-time' },
    { icon: '📊', title: 'Real-Time Analytics', desc: 'Monitor engagement and mastery levels' },
    { icon: '🎙️', title: 'Natural Speech', desc: 'AI that sounds human and understands context' },
  ];

  return (
    <section ref={ref} className="relative min-h-screen bg-black py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-10 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-5xl sm:text-7xl font-black text-center mb-6"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
            The AI Classroom Experience
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-center text-gray-300 mb-16 text-lg max-w-2xl mx-auto"
        >
          Step into the future where learning feels personal, engaging, and intelligent.
        </motion.p>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-purple-500/50 backdrop-blur-md transition-all duration-300"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Experience Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.7, duration: 1 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-1"
        >
          <div className="bg-black rounded-3xl p-12 text-center">
            <div className="w-full h-64 bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <div className="text-center">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-white font-semibold text-lg">Premium Interactive Classroom Demo</p>
                <p className="text-gray-400 text-sm mt-2">Request a demo to experience the future of education</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ==================== EVERY ROLE ONE PLATFORM ====================
function RoleSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  const roles = [
    { role: 'Students', icon: '🎓', color: 'from-blue-500 to-cyan-500' },
    { role: 'Teachers', icon: '👨‍🏫', color: 'from-green-500 to-emerald-500' },
    { role: 'Parents', icon: '👨‍👩‍👧', color: 'from-yellow-500 to-orange-500' },
    { role: 'Principals', icon: '🏢', color: 'from-purple-500 to-pink-500' },
    { role: 'Districts', icon: '🌐', color: 'from-indigo-500 to-purple-500' },
    { role: 'Administrators', icon: '⚙️', color: 'from-red-500 to-pink-500' },
  ];

  return (
    <section ref={ref} className="relative min-h-screen bg-gradient-to-b from-black to-blue-950/50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl sm:text-7xl font-black mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-300">
              Every Role. One Platform.
            </span>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Unified intelligence for students, teachers, parents, and administrators.
          </p>
        </motion.div>

        {/* Role Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.7 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`group p-8 rounded-2xl bg-gradient-to-br ${item.color}/10 border border-white/10 hover:border-white/30 backdrop-blur-md transition-all duration-300 cursor-pointer`}
            >
              <div className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-300">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{item.role}</h3>
              <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                Tailored tools and insights for {item.role.toLowerCase()}
              </p>
              <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">Learn more</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== INTELLIGENCE LAYER ====================
function IntelligenceSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  const capabilities = [
    { title: 'At-Risk Detection', desc: 'System identifies struggles before grades reflect them' },
    { title: 'Learning Heatmaps', desc: 'Visualize mastery across topics and concepts' },
    { title: 'Predictive Analytics', desc: 'Forecast outcomes and intervene proactively' },
    { title: 'Engagement Tracking', desc: 'Understand what keeps students motivated' },
  ];

  return (
    <section ref={ref} className="relative min-h-screen bg-black py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl sm:text-7xl font-black mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
              The Intelligence Layer
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            The system notices struggles before grades do.
          </p>
        </motion.div>

        {/* Capabilities Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {capabilities.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-cyan-500/50 transition-all duration-300"
            >
              <h3 className="text-2xl font-bold text-white mb-3">{cap.title}</h3>
              <p className="text-gray-400">{cap.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Analytics Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.6, duration: 1 }}
          className="rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 p-1 overflow-hidden"
        >
          <div className="bg-black rounded-3xl p-12">
            <div className="grid md:grid-cols-2 gap-8 h-80">
              <div className="rounded-2xl bg-gradient-to-br from-cyan-900/30 to-transparent border border-cyan-500/20 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Student Engagement</p>
                  <div className="h-20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-transparent border border-blue-500/20 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Mastery Distribution</p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="w-1/2 h-2 bg-cyan-500/40 rounded" />
                      <div className="w-1/2 h-2 bg-cyan-500/20 rounded" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2/3 h-2 bg-blue-500/40 rounded" />
                      <div className="w-1/3 h-2 bg-blue-500/20 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ==================== GLOBAL EDUCATION ====================
function GlobalSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section ref={ref} className="relative min-h-screen bg-gradient-to-b from-black to-green-950/30 py-20 px-4 sm:px-6 lg:px-8">
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl sm:text-7xl font-black mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-300">
              Global Education. No Borders.
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Supporting 109+ languages and RTL scripts. Learning transcends geography.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: '109+ Languages', desc: 'Multilingual AI adapts to every student', icon: '🌍' },
            { title: 'RTL Support', desc: 'Seamless experience for Arabic, Hebrew, and more', icon: '📝' },
            { title: 'Accessible Everywhere', desc: 'Works on any device, any connectivity', icon: '📱' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.7 }}
              whileHover={{ y: -8 }}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-green-500/50 transition-all duration-300 text-center"
            >
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Globe Visualization */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-20 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-12 text-center h-80 flex items-center justify-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 300">
              <circle cx="200" cy="150" r="120" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" />
              <circle cx="200" cy="150" r="100" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.2" />
              {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                return <circle key={i} cx={200 + Math.cos(angle) * 100} cy={150 + Math.sin(angle) * 100} r="4" fill="#10b981" opacity="0.5" />;
              })}
            </svg>
          </div>
          <div className="relative z-10">
            <Globe className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <p className="text-white font-semibold text-lg">Learning Without Geographic Limits</p>
            <p className="text-gray-400">AI education available to students worldwide</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ==================== SECURITY SECTION ====================
function SecuritySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  const security = [
    { icon: '🔐', title: 'JWT Authentication', desc: 'Secure token-based access' },
    { icon: '👥', title: 'Role-Based Access', desc: 'Granular permission controls' },
    { icon: '📋', title: 'FERPA/GDPR', desc: 'Full regulatory compliance' },
    { icon: '🔑', title: 'Multi-Factor Auth', desc: 'Additional security layer' },
    { icon: '📝', title: 'Audit Logging', desc: 'Complete activity tracking' },
    { icon: '🏢', title: 'Tenant Isolation', desc: 'Data separation guaranteed' },
  ];

  return (
    <section ref={ref} className="relative min-h-screen bg-black py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-20 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl sm:text-7xl font-black mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-pink-300">
              Enterprise-Grade Security
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Your data is protected with the same standards as global financial systems.
          </p>
        </motion.div>

        {/* Security Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {security.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.7 }}
              className="p-6 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-red-500/50 transition-all duration-300 text-center"
            >
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==================== FUTURE STATEMENT ====================
function FutureSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <section ref={ref} className="relative min-h-screen bg-gradient-to-b from-black via-blue-950/50 to-black py-20 px-4 sm:px-6 lg:px-8 flex items-center">
      <div className="relative z-10 max-w-6xl mx-auto w-full text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8 leading-tight"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-300">
            Built for the schools that will define the next decade.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl text-gray-300 max-w-2xl mx-auto mb-12"
        >
          LearnAI isn't just software. It's the future of education, available today.
        </motion.p>

        {/* Stats Callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="inline-flex gap-8 p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 mb-12"
        >
          {[
            { number: '1000+', label: 'Schools Ready' },
            { number: '50M+', label: 'Potential Students' },
            { number: '24/7', label: 'AI Support' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-blue-300">{stat.number}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonial Placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="p-12 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10"
        >
          <p className="text-gray-300 text-lg italic mb-4">
            "The future of education isn't just digital—it's intelligent, adaptive, and profoundly human."
          </p>
          <p className="text-gray-400">— The educators and innovators building with LearnAI</p>
        </motion.div>
      </div>
    </section>
  );
}

// ==================== FINAL CTA SECTION ====================
function FinalCTASection() {
  const router = useRouter();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <section ref={ref} className="relative min-h-screen bg-black py-20 px-4 sm:px-6 lg:px-8 flex items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto w-full text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="text-6xl sm:text-7xl font-black mb-6"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-300 to-white">
            The Future Of Education<br />Is Adaptive
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-xl text-gray-300 max-w-2xl mx-auto mb-12"
        >
          Every student deserves a system that understands how they learn. Join us in making that reality.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => router.push('/auth/signup')}
            className="px-10 py-5 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Building The Future
          </button>
          <button
            onClick={() => router.push('/contact')}
            className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold text-lg rounded-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
          >
            Book a Demo
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer className="relative bg-black border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-black text-2xl text-white mb-4">LearnAI</h3>
            <p className="text-gray-400 text-sm">The AI-Native School Operating System</p>
          </div>
          {[
            { title: 'Platform', links: ['Features', 'Security', 'Pricing'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">&copy; 2026 LearnAI. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Twitter</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">LinkedIn</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ==================== MAIN PAGE ====================
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black overflow-x-hidden">
      <HeroSection />
      <ProblemSection />
      <VisionSection />
      <AIClassroomSection />
      <RoleSection />
      <IntelligenceSection />
      <GlobalSection />
      <SecuritySection />
      <FutureSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
