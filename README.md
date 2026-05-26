<div align="center">

# 🎓 LearnAI

### **The AI-Native School Operating System**

*Adaptive classrooms. Intelligent analytics. Every student. Every role. One platform.*

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)

[🌐 Live Platform](https://learnai.study) · [📖 Docs](#) · [🚀 Get Started](#getting-started)

---

</div>

## 🚀 The Problem

Education is still being delivered the same way it was 100 years ago — one pace, one style, one curriculum for every student. Teachers are overwhelmed. Students fall behind. Schools lack the data to act. **Learning is broken.**

---

## 💡 Our Solution

**LearnAI** is a full-stack, AI-powered school platform that replaces static classrooms with adaptive, personalized, data-driven learning experiences — built for every stakeholder in a school from students and teachers to principals, parents, and district supervisors.

> **TL;DR:** ChatGPT met Google Classroom, hired a data science team, and built a school.

---

## 📊 Platform at a Glance

| Metric | Value |
|---|---|
| 👥 User Roles | 9 (Student, Teacher, Parent, Principal, Admin, Supervisor, Accountant, SaaS Admin, School Admin) |
| 🔌 API Endpoints | 212+ |
| 📄 Dashboard Pages | 56+ |
| 🌐 Languages Supported | 109 |
| 🤖 LLM Providers | 5 (OpenAI, Anthropic, Google, DeepSeek, Qwen) |
| 🗄️ Database Tables | 40+ |
| 📤 Export Formats | PPTX, PDF, HTML, JSON, CSV |

---

## ✨ Features

### 🤖 AI-Powered Adaptive Learning

The core of LearnAI — not just AI-assisted, but AI-native from the ground up.

- **Learning DNA™** — A dynamic student ability profile built from diagnostic tests, learning style detection (visual, auditory, kinesthetic, reading), and interest profiling. Every student gets a unique fingerprint.
- **Adaptive Learning Paths** — AI generates personalized learning sequences based on each student's Learning DNA. Topics unlock as mastery is demonstrated (0–100% tracked per topic).
- **AI Classroom (OpenMAIC)** — A fully interactive, multi-agent classroom with AI instructors who adapt to student responses in real time. Supports slide scenes, quiz scenes, interactive scenes, project-based learning, and whiteboard collaboration.
- **AI Content Generation** — Teachers input a syllabus; LearnAI generates entire courses, lesson plans, quizzes, and interactive classroom sessions in minutes.
- **Diagnostic Testing** — AI-generated baseline assessments identify knowledge gaps, overconfidence, and prerequisite issues before teaching begins.

---

### 🧑‍🎓 Student Experience

Everything a modern learner needs, personalized to them.

| Feature | Description |
|---|---|
| 📚 Adaptive Classes | AI-generated sessions personalized per student |
| 🗺️ Learning Path | Visual journey through curriculum with milestone tracking |
| 📝 Assignments & Grades | Submit work, receive feedback, track performance |
| 🧩 Topic Mastery | Skill-by-skill progress tracking |
| 💼 Portfolio | Showcase achievements and completed work |
| 🎓 Certificates | Auto-generated, QR-verified completion certificates |
| 💬 Real-time Chat | Peer and teacher communication |
| 🔬 Diagnostic Tests | Adaptive tests that shape your learning plan |

---

### 👩‍🏫 Teacher Superpowers

Reduce busywork. Amplify impact.

| Feature | Description |
|---|---|
| ⚡ AI Lesson Generation | Generate full interactive lessons from a syllabus in minutes |
| 📊 Class Heatmaps | Visual engagement and performance patterns across the class |
| 🚨 At-Risk Alerts | Real-time notifications for struggling students |
| 📋 Gradebook | Bulk grading, analytics, and export |
| 🗓️ Attendance | Mark attendance, generate reports |
| 🧪 Quiz Auto-Grading | AI grades quizzes and provides answer analytics |
| 📁 Course Builder | Build multi-module courses with file uploads and resources |
| 🎯 Student Deep Dive | Per-student analytics with mistake patterns and learning gaps |

---

### 🏫 School Administration

Everything a principal needs to run a modern school.

- **Staff Management** — Hire teachers, assign roles, manage permissions
- **Enrollment Workflows** — Approve/reject teacher and student join requests
- **School Billing** — Subscription management, fee structures, payment tracking
- **School-Wide Analytics** — Performance metrics, attendance, and engagement at the school level
- **Curriculum Standards** — Configure grade levels, subjects, and curriculum standards
- **Branding & Configuration** — Custom school branding and settings

---

### 👨‍👩‍👧 Parent Portal

Stay in the loop. Every step of the way.

- Real-time child progress and grade tracking
- Direct messaging with teachers
- Configurable notification preferences
- Consent management for advanced monitoring features
- Learning analytics for every subject

---

### 🔐 Enterprise-Grade Security

Security is not an afterthought.

- **JWT Authentication** — 24-hour access tokens + 7-day rotating refresh tokens
- **2FA/MFA** — TOTP authenticator apps, SMS, and email verification
- **Role-Based Access Control (RBAC)** — Enforced on all 212+ API endpoints via `withRole()` middleware
- **Multi-Tenant Isolation** — School, class, and user-level data boundaries enforced at the query level
- **Password Security** — bcrypt hashing with 10+ salt rounds and timing-safe comparison
- **Audit Logging** — Full activity trail for FERPA/GDPR compliance
- **Secure Sessions** — httpOnly, Secure, SameSite cookies with automatic token refresh

---

### 📈 Analytics & Monitoring

Data that drives decisions — not just dashboards.

- **Student Monitoring System** — Role-scoped real-time engagement and attention tracking (student → parent → teacher → principal → admin hierarchy)
- **Learning Heatmaps** — Visual patterns of performance and engagement
- **Predictive Insights** — At-risk student identification before they fail
- **Mistake Pattern Analysis** — Categorize common errors for targeted remediation
- **Trend Analysis** — Historical progress visualization across subjects and time
- **90-Day Retention** — Automatic cleanup of monitoring data with privacy controls

---

### 💳 Payments & Billing

Built for schools to run as businesses.

- **Stripe Integration** — Checkout, subscriptions, payment methods, invoices, webhooks
- **Subscription Tiers** — Basic, Premium, Enterprise with feature-level enforcement
- **Fee Structures** — Configurable tuition and student fees
- **Financial Ledger** — Transaction history and payment tracking for accountants
- **Multi-School Billing** — Platform-level billing management for SaaS administrators

---

### 🌐 Internationalization

Built for the world.

- **109 Languages** — Full language selection for content generation and UI
- **Multi-Region TTS** — Azure Text-to-Speech with multiple accent options
- **RTL Support** — Right-to-left language layout support

---

### 📤 Export & Interoperability

Your data, your way.

| Format | Use Case |
|---|---|
| 📊 PPTX | Export AI-generated classrooms as PowerPoint presentations |
| 🌐 HTML | Web-viewable content with embedded media |
| 📄 PDF | Static documents with full formatting |
| 📋 CSV | Spreadsheet exports for grades and analytics |
| 🔗 JSON | Raw data for third-party integrations |
| 🎓 Certificates | QR-verified digital credentials |

---

### 🛠️ AI Classroom — Deep Dive

The flagship product. Nothing like it exists.

```
Whiteboard Tools          Scene Types               AI Features
─────────────────         ─────────────             ─────────────────────
✏️  Drawing               📊 Slide                  🤖 Multi-agent personas
🔷 Shapes                 ❓ Quiz                   🗣️  Real-time adaptation
📈 Charts                 🤝 Interactive            🎙️  Speech synthesis (TTS)
📐 LaTeX                  🔬 Project-Based          🖼️  Image generation
📊 Tables                 🎥 Video                  📝 Transcription
🔦 Spotlight              💬 Discussion             🌊 Streaming generation
```

- Export the entire classroom as PPTX, HTML, or PDF with one click
- Session analytics track per-student engagement metrics
- Supports any LLM backend: OpenAI GPT-4, Anthropic Claude, Google Gemini, DeepSeek, Qwen

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (Edge + Node.js runtime) |
| **Database** | PostgreSQL with pg and Prisma ORM |
| **Auth** | Custom JWT with 2FA/MFA |
| **AI/LLM** | OpenAI, Anthropic, Google, DeepSeek, Qwen |
| **Payments** | Stripe |
| **Storage** | S3-compatible object storage |
| **TTS** | Azure Cognitive Services |
| **Package Manager** | pnpm (via corepack) |
| **License** | AGPL-3.0 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20.9.0
- PostgreSQL 16+
- pnpm (via corepack)

### Installation

```bash
# Clone the repository
git clone https://github.com/atulpokharel-gp/aischool.git
cd aischool

# Enable corepack and install dependencies
corepack enable
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL, API keys, etc.

# Seed demo data (optional)
pnpm seed:demo

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the platform.

### Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_AI_API_KEY=...
STRIPE_SECRET_KEY=...
AZURE_TTS_KEY=...
```

---

## 🗺️ Roadmap

- [ ] Mobile apps (iOS & Android)
- [ ] Live video classroom integration
- [ ] District-level multi-school dashboards
- [ ] Marketplace for AI-generated courses
- [ ] Offline mode for low-connectivity regions
- [ ] Advanced proctoring and exam integrity tools

---

## 📜 License

LearnAI is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means you can freely use, modify, and distribute the platform — but any modifications deployed over a network must also be open-sourced under the same license.

See [LICENSE](./LICENSE) for full details.

---

## 🤝 Contributing

We welcome contributions from educators, engineers, and AI enthusiasts. Please open an issue or pull request to get started.

---

<div align="center">

**Built with ❤️ for the future of education**

[LearnAI.study](https://learnai.study) · [GitHub](https://github.com/atulpokharel-gp/aischool)

</div>

# meclass
