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
  Heart,
} from 'lucide-react';

// Particle Canvas Component
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
      ctx.fillStyle = 'rgba(15, 15, 46, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity = Math.sin(Date.now() / 1000 + p.x + p.y) * 0.3 + 0.3;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(p.x, p.y, p.size, p.size);

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

  return (
    <div className="relative min-h-screen bg-black">
      <nav className="sticky top-0 z-50 glass-effect-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-black text-glow-neon">aischool365</div>
          <div className="hidden md:flex gap-8">
            <a href="#why" className="text-gray-300 hover:text-blue-300">Why Us</a>
            <a href="#story" className="text-gray-300 hover:text-blue-300">Our Story</a>
            <a href="#features" className="text-gray-300 hover:text-blue-300">Features</a>
          </div>
          <button onClick={() => router.push('/auth/signup')} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded">
            Get Started
          </button>
        </div>
      </nav>

      <ParticleCanvas />

      <section className="relative z-10 max-w-7xl mx-auto px-4 py-40">
        <h1 className="text-7xl font-black mb-6">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Education</span>
          <br />Borderless & Costless
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mb-8">
          Three engineers from Nepal. One mission: transform global education with AI. Education without borders. Learning without cost.
        </p>
        <button onClick={() => router.push('/auth/signup')} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg">
          Start Free
        </button>
      </section>

      <section id="story" className="relative z-10 max-w-7xl mx-auto px-4 py-40">
        <h2 className="text-6xl font-black mb-12">Our Story</h2>
        <div className="space-y-8">
          <div className="glass-effect-strong p-8 rounded-2xl">
            <h3 className="text-3xl font-bold mb-4">The Beginning</h3>
            <p className="text-lg text-gray-300">Three engineers from Nepal arrived in developed countries for doctoral degrees. They witnessed a fundamental inequity: billions of students in developing nations had no access to quality education.</p>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl">
            <h3 className="text-3xl font-bold mb-4">The Realization</h3>
            <p className="text-lg text-gray-300">Education isn't borderless. It's trapped behind paywalls, geography, and resource scarcity. Yet AI offered a solution: personalized, adaptive learning at zero cost.</p>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl">
            <h3 className="text-3xl font-bold mb-4">aischool365 Was Born</h3>
            <p className="text-lg text-gray-300">We built aischool365 with one radical mission: make world-class education borderless and completely free forever. Education should be a right, not a commodity.</p>
          </div>
        </div>
      </section>

      <section id="why" className="relative z-10 max-w-7xl mx-auto px-4 py-40">
        <h2 className="text-6xl font-black mb-12">Why aischool365?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-effect-strong p-8 rounded-2xl">
            <Globe className="w-12 h-12 text-cyan-300 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Borderless</h3>
            <p className="text-gray-300">Available in 50+ languages. Works anywhere. No geographic restrictions.</p>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl">
            <Heart className="w-12 h-12 text-pink-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Free Forever</h3>
            <p className="text-gray-300">Not a trial. Not limited. Completely free for schools and students.</p>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl">
            <Brain className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">AI-Powered</h3>
            <p className="text-gray-300">Personalized learning for every student. Intelligent at scale.</p>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 py-40">
        <h2 className="text-6xl font-black mb-12">Features</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-effect-strong p-8 rounded-2xl flex gap-4">
            <Zap className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold mb-2">AI Lesson Generation</h3>
              <p className="text-gray-300">Generate comprehensive lessons in seconds</p>
            </div>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl flex gap-4">
            <BarChart3 className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold mb-2">Real-Time Analytics</h3>
              <p className="text-gray-300">Track every student's progress instantly</p>
            </div>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl flex gap-4">
            <BookOpen className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold mb-2">Adaptive Quizzes</h3>
              <p className="text-gray-300">Auto-generated assessments that adapt to mastery level</p>
            </div>
          </div>
          <div className="glass-effect-strong p-8 rounded-2xl flex gap-4">
            <Globe className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold mb-2">Multi-Language</h3>
              <p className="text-gray-300">Support diverse communities globally</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-4 py-40 text-center">
        <h2 className="text-5xl font-black mb-6">Ready to Join the Movement?</h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Be part of transforming global education. Start free. No credit card. Just world-class learning.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => router.push('/auth/signup')} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold">Get Started</button>
          <button onClick={() => router.push('/contact')} className="px-8 py-4 border border-white/20 text-white rounded-lg font-bold">Contact</button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 text-gray-400 py-20">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="text-xl font-bold text-white mb-4">aischool365</div>
            <p className="text-sm">Education without borders. Learning without cost.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-blue-400">Features</a></li>
              <li><a href="#story" className="hover:text-blue-400">Story</a></li>
              <li><Link href="/about" className="hover:text-blue-400">About</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-blue-400">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-400">Terms of Service</Link></li>
              <li><a href="#" className="hover:text-blue-400">Cookie Settings</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-blue-400">Contact</Link></li>
              <li><a href="#" className="hover:text-blue-400">Blog</a></li>
              <li><a href="#" className="hover:text-blue-400">Careers</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 text-center text-sm">
          <p>&copy; 2026 aischool365. Education without borders.</p>
          <div className="mt-4 flex gap-4 justify-center">
            <Link href="/privacy" className="hover:text-blue-400">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-400">Terms</Link>
            <a href="#" className="hover:text-blue-400">Security</a>
          </div>
        </div>
      </footer>

      <style>{`
        .glass-effect-strong {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .text-glow-neon {
          background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}
