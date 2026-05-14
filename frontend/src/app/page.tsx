import Link from 'next/link';
import { ArrowRight, FileUp, Monitor, BarChart3, Users, CheckCircle, ClipboardList, BrainCircuit, Upload, Zap, Shield } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import Reveal from '@/components/Reveal';

export const metadata = {
  title: 'Clarity – AI-Powered Assessment Platform',
  description: 'Build question banks, run proctored tests, and analyze results — powered by AI.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans relative">
      <ParticleBackground />
      <div className="relative" style={{ zIndex: 1 }}>

        {/* ── NAV ── */}
        <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="text-xl font-black text-gray-900">Clarity</span>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
              <a href="#features" className="hover:text-orange-500 transition-colors duration-200">Features</a>
              <a href="#roles" className="hover:text-orange-500 transition-colors duration-200">Roles</a>
              <a href="#how-it-works" className="hover:text-orange-500 transition-colors duration-200">How It Works</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-orange-500 transition-colors duration-200 px-4 py-2">Sign In</Link>
              <Link href="/login" className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]">Get Started <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="min-h-[92vh] flex items-center px-6 py-20">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-20 items-center">

              {/* Left — text */}
              <div className="animate-fade-in-up">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full mb-8">
                  <Zap className="w-3 h-3" /> AI-Powered Assessment Platform
                </div>
                <h1 className="text-6xl md:text-7xl font-black text-gray-900 leading-[0.95] tracking-tight mb-8">
                  Assess.<br />
                  <span className="text-orange-gradient">Analyze.</span><br />
                  Grow.
                </h1>
                <p className="text-lg text-gray-500 font-medium leading-relaxed mb-10 max-w-lg">
                  Upload PDFs to auto-generate questions with AI, publish timed tests, monitor students live, and export results — all in one place.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/login" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]">
                    Open Portal <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a href="#features" className="inline-flex items-center gap-2 text-base font-semibold text-gray-500 hover:text-orange-500 transition-colors duration-200 px-4 py-4">
                    See features →
                  </a>
                </div>
              </div>

              {/* Right — floating mock cards */}
              <div className="hidden lg:block relative h-[440px]">
                <div className="absolute top-0 right-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-64 animate-fade-in-up card-fluid">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">PDF Processed</p>
                      <p className="text-sm font-bold text-gray-900">Chapter 4 — Biology</p>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900 mb-1">47 <span className="text-base font-semibold text-gray-400">questions</span></p>
                  <p className="text-xs text-gray-400 mb-3">Extracted by AI in 8 seconds</p>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-orange-400 rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>

                <div className="absolute top-48 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-56 animate-fade-in-up delay-100 card-fluid">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-900">Live Session</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                      Active
                    </span>
                  </div>
                  <p className="text-3xl font-black text-gray-900">24</p>
                  <p className="text-xs text-gray-400 mt-1">Students taking test</p>
                </div>

                <div className="absolute bottom-0 right-10 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-52 animate-fade-in-up delay-200 card-fluid">
                  <p className="text-xs text-gray-400 mb-2">Latest Submission</p>
                  <p className="text-4xl font-black text-orange-500 mb-2">91%</p>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold text-gray-500">Passed · 45 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STRIP ── */}
        <Reveal>
          <div className="border-y border-gray-100 bg-white/70 backdrop-blur-sm py-5">
            <div className="max-w-5xl mx-auto px-6 flex flex-wrap justify-center gap-8">
              {[
                { icon: BrainCircuit, label: 'AI Question Extraction' },
                { icon: ClipboardList, label: 'Multi-Section Tests' },
                { icon: Monitor, label: 'Live Proctoring' },
                { icon: BarChart3, label: 'Instant Scoring' },
                { icon: Upload, label: 'CSV Bulk Upload' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm font-semibold text-gray-500 transition-colors duration-200 hover:text-orange-500">
                  <item.icon className="w-4 h-4 text-orange-400" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── FEATURES ── */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-7xl mx-auto space-y-32">

            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <Reveal>
                <div className="bg-orange-50 rounded-3xl p-12 flex items-center justify-center min-h-[300px] panel-hover">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-5 transition-transform duration-300 hover:scale-110">
                      <FileUp className="w-10 h-10 text-orange-500" />
                    </div>
                    <p className="text-2xl font-black text-gray-900 mb-2">Upload any PDF</p>
                    <p className="text-gray-500 text-sm">AI extracts MCQs &amp; descriptive questions instantly</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4">01 — Question Bank</p>
                  <h2 className="text-4xl font-black text-gray-900 mb-5 leading-tight">Turn any PDF into a question bank in seconds</h2>
                  <p className="text-gray-500 leading-relaxed mb-8">Upload any study material or document — Clarity's AI engine automatically extracts, formats, and categorizes MCQ and descriptive questions directly into your question bank. No manual entry needed.</p>
                  <ul className="space-y-3">
                    {['Supports any PDF format', 'Auto-detects question types', 'Manual add & bulk CSV import also available'].map((pt, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <Reveal delay={120} className="order-2 lg:order-1">
                <div>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4">02 — Live Proctoring</p>
                  <h2 className="text-4xl font-black text-gray-900 mb-5 leading-tight">Watch every session as it happens</h2>
                  <p className="text-gray-500 leading-relaxed mb-8">The real-time monitoring dashboard shows you every active student session. Get instant violation alerts, view per-attempt behaviour reports, and ensure academic integrity throughout.</p>
                  <ul className="space-y-3">
                    {['Real-time session view', 'Violation detection alerts', 'Per-student attempt history'].map((pt, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal className="order-1 lg:order-2">
                <div className="bg-gray-900 rounded-3xl p-12 flex items-center justify-center min-h-[300px] panel-hover">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-5 transition-transform duration-300 hover:scale-110">
                      <Monitor className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-2xl font-black text-white mb-2">24 Active Now</p>
                    <p className="text-gray-400 text-sm">Live proctoring enabled</p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <Reveal>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-12 flex items-center justify-center min-h-[300px] panel-hover">
                  <div className="text-center">
                    <p className="text-7xl font-black text-white mb-3">91%</p>
                    <p className="text-orange-100 text-sm font-medium">Auto-scored on submit</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4">03 — Results</p>
                  <h2 className="text-4xl font-black text-gray-900 mb-5 leading-tight">Scores the moment they submit</h2>
                  <p className="text-gray-500 leading-relaxed mb-8">Tests are graded automatically the instant a student submits. Admins can view all attempt scores, pass/fail status, and export the full results as a CSV file for offline reporting.</p>
                  <ul className="space-y-3">
                    {['Instant auto-grading', 'Pass/fail with score breakdown', 'Export results as CSV'].map((pt, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── ROLES ── */}
        <section id="roles" className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">Built for every role</h2>
                <p className="text-gray-400 max-w-md mx-auto text-base">Each user type gets a purpose-built experience.</p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-5">

              {[
                {
                  icon: Shield, label: 'Super Admin',
                  accent: '#10b981', lightBg: '#f0fdf4',
                  cardCls: 'role-card-emerald',
                  desc: 'Full platform control — users, admins, and system-wide settings.',
                  tags: ['User Management', 'Bulk Upload', 'All Access'],
                },
                {
                  icon: Users, label: 'Admin',
                  accent: '#f97316', lightBg: '#fff7ed',
                  cardCls: 'role-card-orange',
                  desc: 'Build question banks, run tests, proctor live, export results.',
                  tags: ['Question Bank', 'Test Builder', 'Live Monitor'],
                },
                {
                  icon: ClipboardList, label: 'Student',
                  accent: '#3b82f6', lightBg: '#eff6ff',
                  cardCls: 'role-card-blue',
                  desc: 'Take assigned tests and view results instantly after submitting.',
                  tags: ['Take Tests', 'Instant Score', 'Result History'],
                },
              ].map((r, i) => (
                <Reveal key={i} delay={i * 110}>
                  <div className={`group relative bg-white border border-gray-100 rounded-2xl p-7 flex flex-col gap-5 cursor-default overflow-hidden role-card ${r.cardCls}`}>
                    {/* Animated bottom line */}
                    <div
                      className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full rounded-full"
                      style={{ backgroundColor: r.accent, transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)' }}
                    />
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: r.lightBg }}
                    >
                      <r.icon className="w-6 h-6" style={{ color: r.accent }} />
                    </div>
                    {/* Text */}
                    <div>
                      <p className="text-lg font-black text-gray-900 mb-1">{r.label}</p>
                      <p className="text-sm text-gray-400 leading-relaxed">{r.desc}</p>
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {r.tags.map(tag => (
                        <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: r.lightBg, color: r.accent }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}

            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">Up in 3 steps</h2>
                <p className="text-gray-500">From first login to published test in minutes.</p>
              </div>
            </Reveal>
            <div className="relative">
              <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200" />
              <div className="grid md:grid-cols-3 gap-12">
                {[
                  { n: '01', title: 'Build your question bank', desc: 'Upload PDFs or add questions manually. AI handles extraction and formatting.' },
                  { n: '02', title: 'Create & publish a test', desc: 'Pick questions, set a timer, configure sections — publish with one click.' },
                  { n: '03', title: 'Monitor & export results', desc: 'Watch students live, get alerts, then download scores as CSV.' },
                ].map((s, i) => (
                  <Reveal key={i} delay={i * 120}>
                    <div className="flex flex-col items-center text-center group">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white font-black text-xl flex items-center justify-center shadow-md mb-6 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg">
                        {s.n}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <Reveal>
          <section className="px-6 py-24">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-3xl p-16 text-center relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 -ml-12 -mb-12" />
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-5 tracking-tight">Ready to run your first test?</h2>
                  <p className="text-orange-100 text-lg mb-10 max-w-md mx-auto">Sign in and start building your question bank, publishing tests, and monitoring students today.</p>
                  <Link href="/login" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-10 py-4 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:scale-[1.03] active:scale-[0.97]">
                    Go to Portal <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── FOOTER ── */}
        <footer className="bg-gray-900 text-white py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-xl font-black">Clarity</span>
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Clarity. Built for modern education.</p>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Support'].map(l => (
                <a key={l} href="#" className="text-sm text-gray-400 hover:text-orange-400 transition-colors duration-200">{l}</a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
