'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Zap,
  Globe,
  Users,
  Shield,
  Star,
  Menu,
  X,
  Sparkles,
  Rocket,
  Brain,
} from 'lucide-react';

// Particle Canvas Component for Metaverse Effect
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
    }> = [];

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'][Math.floor(Math.random() * 4)],
      });
    }

    const animate = () => {
      // Clear with fade effect
      ctx.fillStyle = 'rgba(15, 15, 46, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity = Math.sin(Date.now() / 1000 + p.x + p.y) * 0.3 + 0.3;

        // Wrap around screen
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle with glow
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(p.x, p.y, p.size, p.size);

        // Draw connecting lines
        particles.forEach((p2) => {
          const dist = Math.hypot(p2.x - p.x, p2.y - p.y);
          if (dist < 150) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (p.opacity * p2.opacity) * (1 - dist / 150) * 0.3;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-50" />;
}

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{count}</span>;
}

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateZ(0deg); }
          25% { transform: translateY(-30px) rotateZ(1deg); }
          75% { transform: translateY(-10px) rotateZ(-1deg); }
        }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3); }
          50% { text-shadow: 0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(139, 92, 246, 0.5); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px) translateZ(0); }
          to { opacity: 1; transform: translateY(0) translateZ(0); }
        }
        @keyframes pulse3d {
          0%, 100% { transform: scale(1) rotateX(0deg) rotateY(0deg); opacity: 1; }
          50% { transform: scale(1.08) rotateX(5deg) rotateY(5deg); opacity: 0.85; }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes matrixRain {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes float3d {
          0%, 100% { transform: translate(0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          25% { transform: translate(20px, -30px) rotateX(10deg) rotateY(10deg) rotateZ(5deg); }
          50% { transform: translate(0, -40px) rotateX(5deg) rotateY(5deg) rotateZ(0deg); }
          75% { transform: translate(-20px, -20px) rotateX(15deg) rotateY(-5deg) rotateZ(-5deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.3); }
        }
        @keyframes shimmerWave {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes bounce3d {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-40px) scaleY(0.95); }
        }
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; text-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.5); }
          2% { opacity: 0.9; }
          4% { opacity: 1; }
          19% { opacity: 1; }
          21% { opacity: 0.8; }
          23% { opacity: 1; }
          100% { opacity: 1; }
        }
        
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .animate-slideIn { animation: slideIn 0.8s ease-out; }
        .animate-pulse3d { animation: pulse3d 3s ease-in-out infinite; }
        .animate-orbitSpin { animation: orbitSpin 25s linear infinite; }
        .animate-shimmer { animation: shimmer 3s infinite; }
        .animate-gradientShift { animation: gradientShift 8s ease infinite; }
        .animate-matrixRain { animation: matrixRain 15s linear infinite; }
        .animate-float3d { animation: float3d 6s ease-in-out infinite; }
        .animate-glowPulse { animation: glowPulse 3s ease-in-out infinite; }
        .animate-shimmerWave { animation: shimmerWave 3s infinite; }
        .animate-bounce3d { animation: bounce3d 3s ease-in-out infinite; }
        .animate-neonFlicker { animation: neonFlicker 3s infinite; }
        
        .gradient-bg {
          background: linear-gradient(135deg, #0f0f2e 0%, #1a0033 25%, #2d1b69 50%, #1a0033 75%, #0f0f2e 100%);
          background-size: 400% 400%;
          animation: gradientShift 12s ease infinite;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .glass-effect-strong {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .neon-border {
          border: 2px solid transparent;
          background-image: 
            linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0)),
            linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #06b6d4);
          background-origin: border-box;
          background-clip: padding-box, border-box;
          position: relative;
        }
        
        .neon-border::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #06b6d4);
          border-radius: inherit;
          opacity: 0;
          z-index: -1;
          filter: blur(20px);
          animation: glowPulse 3s infinite;
        }
        
        .text-glow {
          color: #fff;
          text-shadow: 
            0 0 10px rgba(59, 130, 246, 0.5),
            0 0 20px rgba(139, 92, 246, 0.3),
            0 0 30px rgba(236, 72, 153, 0.2);
        }
        
        .text-glow-neon {
          animation: neonFlicker 4s infinite alternate;
          color: #fff;
        }
        
        .hover-lift:hover {
          transform: translateY(-12px);
          box-shadow: 0 30px 60px rgba(59, 130, 246, 0.25);
        }
        
        .card-hover-3d {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
          perspective: 1200px;
        }
        
        .card-hover-3d:hover {
          transform: rotateX(5deg) rotateY(-5deg) scale(1.05);
        }
        
        .spotlight {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
        }
        
        .code-text {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          letter-spacing: 0.05em;
          color: #3b82f6;
        }
      `}</style>

      {/* Particle Canvas Background */}
      <ParticleCanvas />

      {/* Animated Background */}
      <div className="fixed inset-0 gradient-bg z-0" />
      
      {/* Animated Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <div className="absolute w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 -top-64 -left-64 animate-orbitSpin" />
        <div className="absolute w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 -bottom-64 -right-64 animate-orbitSpin" style={{animationDirection: 'reverse'}} />
        <div className="absolute w-[500px] h-[500px] bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbitSpin" style={{animationDuration: '30s'}} />
        <div className="absolute w-[400px] h-[400px] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 top-1/3 right-1/4 animate-float3d" />
      </div>

      {/* Spotlight Effects */}
      <div className="spotlight fixed top-20 left-1/4 z-0" style={{
        left: `${mousePosition.x * 0.05}px`,
        top: `${mousePosition.y * 0.05}px`,
        transition: 'all 0.3s ease-out'
      }} />
      <div className="spotlight fixed bottom-40 right-1/4 z-0 bg-purple-600" style={{
        right: `${mousePosition.x * 0.05}px`,
        bottom: `${mousePosition.y * 0.05}px`,
        transition: 'all 0.3s ease-out'
      }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-effect-strong border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl text-glow-neon cursor-pointer hover:scale-110 transition duration-300">
            <Rocket className="w-8 h-8 animate-bounce3d" />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent font-black">LearnAI</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center">
            {['Why Us', 'Features', 'Pricing'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(' ', ''))}
                className="text-gray-300 hover:text-blue-300 transition duration-300 relative group font-medium"
              >
                {item}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 group-hover:w-full transition-all duration-500" />
              </button>
            ))}
            <Link href="/about" className="text-gray-300 hover:text-blue-300 transition duration-300 font-medium">
              About
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex gap-3 items-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 text-blue-300 hover:text-blue-100 transition font-bold neon-glow"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg hover:shadow-xl hover:shadow-blue-500/50 transition duration-300 font-bold hover-lift"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white hover:text-blue-400 transition" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-effect-strong border-t border-white/5 p-4 flex flex-col gap-4">
            {['Why Us', 'Features', 'Pricing'].map((item) => (
              <button key={item} onClick={() => scrollToSection(item.toLowerCase().replace(' ', ''))} className="text-gray-300 hover:text-blue-300 text-left font-medium">
                {item}
              </button>
            ))}
            <Link href="/about" className="text-gray-300 hover:text-blue-300 font-medium">
              About
            </Link>
            <button onClick={() => router.push('/auth/login')} className="text-blue-300 font-bold">
              Login
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold"
            >
              Sign Up
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-40">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="animate-slideIn space-y-8">
            <div className="inline-block px-4 py-3 glass-effect-strong rounded-full text-blue-300 text-sm font-bold mb-6 border border-blue-400/30 backdrop-blur-xl hover:border-blue-400/60 transition">
              <span className="animate-pulse">🚀</span> Next-Gen AI Education Platform
            </div>
            
            <div className="space-y-4">
              <h1 className="text-7xl md:text-8xl font-black leading-tight">
                <span className="text-glow-neon inline-block">Transform</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-glow inline-block">Education</span>
                <br />
                <span className="text-white">with AI</span>
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-2xl">
              Experience the <span className="text-cyan-300 font-semibold">metaverse of learning</span>. Personalized AI-powered lessons, adaptive assessments, and real-time intelligence in a platform built for the future.
            </p>
            
            <div className="flex gap-4 flex-col sm:flex-row pt-6">
              <button
                onClick={() => router.push('/auth/signup')}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition duration-300 font-bold flex items-center justify-center gap-3 hover-lift text-lg overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">Enter Platform <Rocket className="w-6 h-6 animate-float" /></span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition duration-300 rounded-xl" style={{zIndex: 0}} />
              </button>
              <button
                onClick={() => router.push('/register-school')}
                className="px-8 py-4 neon-border text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition duration-300 font-bold hover-lift text-lg"
              >
                For Schools
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 border-t border-white/10">
              <div className="space-y-2 hover:scale-110 transition duration-300">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <AnimatedCounter end={150} />+
                </div>
                <div className="text-gray-400 font-semibold">Schools Active</div>
              </div>
              <div className="space-y-2 hover:scale-110 transition duration-300">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  <AnimatedCounter end={50} />K+
                </div>
                <div className="text-gray-400 font-semibold">Students</div>
              </div>
              <div className="space-y-2 hover:scale-110 transition duration-300">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">
                  98%
                </div>
                <div className="text-gray-400 font-semibold">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* 3D Hero Card */}
          <div className="relative h-96 md:h-[500px] animate-float3d group">
            {/* Outer Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/40 via-purple-600/40 to-pink-600/40 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition duration-500 animate-glowPulse" />
            
            {/* Main Card */}
            <div className="absolute inset-0 glass-effect-strong rounded-3xl overflow-hidden border border-cyan-400/30 card-hover-3d">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 flex flex-col items-center justify-center p-8 relative">
                {/* Animated background grid */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-400" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>

                {/* Content */}
                <div className="relative z-10 text-center space-y-4 animate-float">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-2xl opacity-50 animate-pulse" />
                    <Brain className="w-32 h-32 text-cyan-300 relative z-10 animate-pulse3d" />
                  </div>
                  <h3 className="text-3xl font-black text-white relative">AI Brain</h3>
                  <p className="text-gray-300 text-sm max-w-xs relative">Advanced learning engine powered by next-generation AI technology</p>
                </div>

                {/* Floating elements */}
                <div className="absolute top-6 right-6 w-2 h-2 bg-blue-400 rounded-full animate-float" style={{animationDelay: '0s'}} />
                <div className="absolute bottom-8 left-6 w-2 h-2 bg-purple-400 rounded-full animate-float" style={{animationDelay: '1s'}} />
                <div className="absolute top-1/2 right-8 w-2 h-2 bg-pink-400 rounded-full animate-float" style={{animationDelay: '2s'}} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Exist Section */}
      <section id="whyus" className="relative z-10 py-32 md:py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 space-y-4 animate-slideIn">
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              Why <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">We</span>
            </h2>
            <h2 className="text-6xl md:text-7xl font-black leading-tight text-white">Exist</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto pt-4">
              Solving the real challenges of modern education
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: Users, label: 'Teachers Overwhelmed', desc: 'Teachers spend 60% of their time on admin work. We free them for what matters most: teaching.', accent: 'from-red-600 to-pink-600' },
              { icon: BarChart3, label: 'Unequal Learning', desc: 'Every student learns differently. One-size-fits-all doesn\'t work. AI personalization changes this.', accent: 'from-yellow-600 to-orange-600' },
              { icon: Shield, label: 'Enterprise Trust', desc: 'Schools need platforms they can rely on. Military-grade security and compliance guaranteed.', accent: 'from-green-600 to-emerald-600' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="group relative hover-lift" onMouseEnter={() => setActiveCard(idx)} onMouseLeave={() => setActiveCard(null)}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500 animate-glowPulse" />
                  <div className="relative glass-effect-strong p-8 rounded-2xl border border-white/10 h-full card-hover-3d">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">{item.label}</h3>
                    <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative group hover-lift">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-3xl blur-2xl animate-glowPulse" />
            <div className="relative glass-effect-strong p-12 md:p-16 rounded-3xl border border-cyan-400/30">
              <div className="flex items-start gap-6">
                <Sparkles className="w-10 h-10 text-cyan-300 flex-shrink-0 mt-2 animate-pulse3d" />
                <div>
                  <h3 className="text-4xl md:text-5xl font-black text-white mb-6">Our Mission</h3>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    Democratize <span className="text-cyan-300 font-bold">AI-powered personalized education</span> for every school globally. We believe every educator deserves intelligent tools to deliver <span className="text-blue-300 font-bold">world-class learning at scale</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 md:py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 space-y-4 animate-slideIn">
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              Powerful
            </h2>
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto pt-4">
              Enterprise capabilities that scale with your school
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Zap, title: 'AI Lesson Generation', desc: 'Generate comprehensive lessons in seconds. Customize for your curriculum and student proficiency level.' },
              { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track every student\'s progress instantly. Data-driven predictions for intervention and achievement.' },
              { icon: BookOpen, title: 'Adaptive Quizzes', desc: 'Auto-generated assessments adapt to mastery level. Get personalized learning paths for each student.' },
              { icon: Globe, title: 'Multi-Language Support', desc: 'Support diverse communities. Global platform with 50+ languages and cultural adaptations.' },
              { icon: Shield, title: 'School Management Suite', desc: 'Complete admin tools for staff, classes, curriculum, enrollments, and billing in one place.' },
              { icon: CheckCircle2, title: 'Enterprise Ready', desc: 'GDPR, FERPA, COPPA compliant. Secure infrastructure. Scale from 1 school to 10,000+.' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="group relative hover-lift" onMouseEnter={() => setActiveCard(idx)} onMouseLeave={() => setActiveCard(null)}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500 animate-glowPulse" />
                  <div className="relative glass-effect-strong p-8 rounded-2xl border border-white/10 flex gap-6 card-hover-3d h-full">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-blue-500/50">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="relative z-10 py-32 md:py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-slideIn">
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              Built for <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Everyone</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto pt-6">
              From single classrooms to education districts
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['For Schools', 'For Teachers', 'For Students', 'For Parents'].map((title, idx) => {
              const descriptions = [
                'Manage multi-role staff, curriculum, billing, and analytics. Integrates with all major SIS platforms.',
                'Generate AI lessons, track mastery milestones, and reduce admin work by 70%. More teaching, less paperwork.',
                'Access personalized learning paths. Your profile follows you across schools. Learn at your pace.',
                'Monitor progress in real-time. Structured learning environment. Safer digital classrooms with privacy controls.',
              ];
              return (
                <div key={idx} className="group relative hover-lift" onMouseEnter={() => setActiveCard(idx)} onMouseLeave={() => setActiveCard(null)}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="relative glass-effect-strong p-8 rounded-xl border border-white/10 card-hover-3d h-full flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-blue-300 transition">{title}</h3>
                    <p className="text-gray-400 flex-1 leading-relaxed">{descriptions[idx]}</p>
                    <div className="mt-4 text-blue-400 font-semibold text-sm group-hover:text-cyan-300 transition">Learn More →</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-32 md:py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-slideIn">
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              How It <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto pt-6">
              From signup to transformation in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Sign Up', desc: 'Onboard your school in 5 minutes with pre-built roles.' },
              { num: '02', title: 'Invite Team', desc: 'Add teachers and staff. Assign roles and permissions instantly.' },
              { num: '03', title: 'Generate Lessons', desc: 'Use AI to create personalized lessons for every class.' },
              { num: '04', title: 'Track & Improve', desc: 'Monitor student mastery in real-time dashboards.' },
            ].map((step, idx) => (
              <div key={idx} className="relative group hover-lift" onMouseEnter={() => setActiveCard(idx)} onMouseLeave={() => setActiveCard(null)}>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500 animate-glowPulse" />
                <div className="relative glass-effect-strong p-8 rounded-2xl border border-white/10 h-full card-hover-3d flex flex-col">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white mb-6 text-2xl shadow-lg group-hover:shadow-blue-500/50">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition">{step.title}</h3>
                  <p className="text-gray-400 flex-1 leading-relaxed">{step.desc}</p>
                  {idx < 3 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 text-purple-400/50">
                      <ArrowRight className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Testimonials */}
      <section className="relative z-10 py-32 md:py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-slideIn">
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              Trusted by <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Educators</span> Worldwide
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto pt-6">
              See what education leaders are saying
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Sarah Johnson', role: 'Principal, Tech High School', quote: 'LearnAI transformed how our teachers work. We cut lesson prep time by 70% and students are more engaged than ever!', rating: 5, school: 'Tech High School' },
              { name: 'Mike Chen', role: 'Teacher, Lincoln Middle', quote: 'The AI-generated lessons are incredible. They\'re perfectly tailored to my students\' level. My job is actually enjoyable now!', rating: 5, school: 'Lincoln Middle' },
              { name: 'Lisa Gonzalez', role: 'Accountant, District Office', quote: 'Finally, a platform that handles everything. Billing, student records, and reporting are seamless. A true game-changer!', rating: 5, school: 'District Office' },
            ].map((testimonial, idx) => (
              <div key={idx} className="group relative hover-lift" onMouseEnter={() => setActiveCard(idx)} onMouseLeave={() => setActiveCard(null)}>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500 animate-glowPulse" />
                <div className="relative glass-effect-strong p-8 rounded-2xl border border-white/10 card-hover-3d h-full flex flex-col">
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic text-lg leading-relaxed">"{testimonial.quote}"</p>
                  <div className="border-t border-white/10 pt-6 mt-auto">
                    <div className="font-bold text-white text-lg">{testimonial.name}</div>
                    <div className="text-blue-400 font-semibold text-sm">{testimonial.school}</div>
                    <div className="text-gray-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 md:py-48">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-slideIn">
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              Simple <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto pt-6">
              Pay only for what you use. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: 'Free',
                description: 'Perfect for trying it out',
                features: ['Up to 50 students', 'Basic AI lessons', 'Progress tracking', 'Email support'],
              },
              {
                name: 'Professional',
                price: '$299',
                period: '/month',
                description: 'For growing schools',
                features: ['Up to 500 students', 'Advanced AI lessons', 'Real-time analytics', 'staff management', 'API access', 'Priority support', 'Custom branding'],
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large organizations',
                features: ['Unlimited students', 'Custom integrations', 'Dedicated support', '99.99% SLA', 'White-label option', 'On-premise deployment'],
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`relative group hover-lift ${plan.highlighted ? 'md:scale-105' : ''}`}
              >
                <div className={`absolute -inset-2 bg-gradient-to-r ${plan.highlighted ? 'from-blue-600/40 to-purple-600/40' : 'from-blue-600/20 to-purple-600/20'} rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500 animate-glowPulse`} />
                <div className={`relative glass-effect-strong p-10 rounded-3xl border ${plan.highlighted ? 'border-blue-400/50' : 'border-white/10'} h-full flex flex-col card-hover-3d`}>
                  {plan.highlighted && (
                    <div className="absolute -top-5 left-8 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-full shadow-lg">
                      ⭐ POPULAR
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold text-white">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
                  </div>
                  <div className="mb-8">
                    <div className="text-5xl font-black text-glow-neon">{plan.price}</div>
                    {plan.period && <div className="text-gray-400 text-lg">{plan.period}</div>}
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className={`w-full py-4 px-6 rounded-xl font-bold transition duration-300 text-lg ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-blue-500/50 hover-lift'
                        : 'glass-effect border border-white/20 text-white hover:border-white/50 hover:bg-white/5'
                    }`}
                  >
                    {plan.highlighted ? 'Start Free Trial' : 'Get Started'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 md:py-48">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl animate-glowPulse" />
          <div className="relative glass-effect-strong rounded-3xl border border-cyan-400/30 p-12 md:p-20 text-center">
            <h2 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
              Ready to <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">Transform</span>?
            </h2>
            <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join hundreds of schools delivering personalized AI-powered education at scale. Start your free trial today—no credit card required.
            </p>
            <div className="flex gap-4 justify-center flex-col sm:flex-row flex-wrap">
              <button
                onClick={() => router.push('/auth/signup')}
                className="px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition duration-300 font-bold hover-lift text-lg"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => router.push('/register-school')}
                className="px-10 py-4 neon-border text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition duration-300 font-bold hover-lift text-lg"
              >
                Register School
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="px-10 py-4 glass-effect border border-white/20 text-white rounded-xl hover:border-white/50 transition duration-300 font-bold hover-lift text-lg"
              >
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass-effect-strong border-t border-white/5 text-gray-400 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-10 mb-16">
            <div>
              <div className="flex items-center gap-2 font-bold text-white mb-6 text-xl group cursor-pointer hover:scale-110 transition">
                <Rocket className="w-6 h-6" />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">LearnAI</span>
              </div>
              <p className="text-gray-500 leading-relaxed">
                Transforming education with AI. One school, one teacher, one student at a time.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Product</h4>
              <ul className="space-y-3">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-blue-400 transition font-medium">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-blue-400 transition font-medium">Pricing</button></li>
                <li><Link href="/about" className="hover:text-blue-400 transition font-medium">About</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/contact" className="hover:text-blue-400 transition font-medium">Contact</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Blog</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Careers</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/faq" className="hover:text-blue-400 transition font-medium">FAQ</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Documentation</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">API Docs</Link></li>
                <li><Link href="/contact" className="hover:text-blue-400 transition font-medium">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Privacy</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Terms</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Security</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition font-medium">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8">
            <p className="text-center text-gray-500 font-medium">
              &copy; 2026 LearnAI. All rights reserved. Building the future of education.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
