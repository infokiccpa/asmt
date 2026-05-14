"use client";
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config';
import Link from 'next/link';
import { Mail, Lock, User, Shield, ArrowRight, UserPlus, CheckCircle, Clock } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, { name, email, password, role });
      
      if (role === 'Admin') {
        // Admin needs approval — show waiting screen
        setPendingApproval(true);
      } else {
        // Student is auto-approved — go straight to login
        alert('Account created! Please login.');
        router.push('/login');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  // ── Pending Approval Screen ────────────────────────────────────────────
  if (pendingApproval) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md text-center animate-fade-in-up">
        <div className="w-20 h-20 bg-orange-50 border-2 border-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-orange-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Pending Approval</h1>
        <p className="text-gray-500 leading-relaxed mb-2">
          Your <span className="font-bold text-orange-500">Admin</span> account has been created successfully.
        </p>
        <p className="text-gray-500 leading-relaxed mb-8">
          A <strong>Super Admin</strong> will review and approve your account. You will be able to log in once approved.
        </p>
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-left mb-8 space-y-2">
          <p className="text-sm font-bold text-orange-800">What happens next?</p>
          <p className="text-sm text-orange-700">1. Super Admin receives a notification of your registration.</p>
          <p className="text-sm text-orange-700">2. They approve or reject your admin access.</p>
          <p className="text-sm text-orange-700">3. Once approved, you can sign in normally.</p>
        </div>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
          Go to Login <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex">

      {/* ─── Left Panel ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 relative overflow-hidden flex-col justify-between p-14">
        {/* Decorations */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/10 -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/10 -ml-16 -mb-16" />
        <div className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-white/30 animate-float" />
        <div className="absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-white/40 animate-float delay-200" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl font-black text-white tracking-tight">
            Clarity
          </span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Start your journey<br />with Clarity
          </h2>
          <p className="text-orange-100 text-lg leading-relaxed max-w-md">
            Create your account and get access to AI-powered assessments, instant results, and deep performance analytics.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3">
            {[
              'AI-generated questions from PDFs',
              'Real-time proctoring & monitoring',
              'Instant results & analytics',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-orange-200 flex-shrink-0" />
                <span className="text-orange-100 font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-orange-100/60 text-xs">
          © {new Date().getFullYear()} Clarity. All rights reserved.
        </p>
      </div>

      {/* ─── Right Panel ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <span className="text-xl font-black text-gray-900">Clarity</span>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 badge-orange mb-4">
              <UserPlus className="w-3 h-3" />
              New Account
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Create Account</h1>
            <p className="text-gray-500 font-medium">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-3">
                 <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                 <span>{errorMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="you@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Role Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
                I am joining as
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Student Card */}
                <button
                  type="button"
                  onClick={() => setRole('Student')}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                    role === 'Student'
                      ? 'border-orange-500 bg-orange-50 shadow-md ring-4 ring-orange-500/10'
                      : 'border-gray-100 bg-gray-50/50 hover:border-orange-200 hover:bg-orange-50/30'
                  }`}
                >
                  {role === 'Student' && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    role === 'Student' ? 'bg-orange-500' : 'bg-gray-200'
                  }`}>
                    <User className={`w-5 h-5 ${role === 'Student' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-black text-sm mb-1 ${role === 'Student' ? 'text-orange-600' : 'text-gray-700'}`}>Student</p>
                  <p className="text-[11px] text-gray-400 leading-snug">Take tests, view results & track progress</p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    Instant Access
                  </span>
                </button>

                {/* Admin Card */}
                <button
                  type="button"
                  onClick={() => setRole('Admin')}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                    role === 'Admin'
                      ? 'border-orange-500 bg-orange-50 shadow-md ring-4 ring-orange-500/10'
                      : 'border-gray-100 bg-gray-50/50 hover:border-orange-200 hover:bg-orange-50/30'
                  }`}
                >
                  {role === 'Admin' && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    role === 'Admin' ? 'bg-orange-500' : 'bg-gray-200'
                  }`}>
                    <Shield className={`w-5 h-5 ${role === 'Admin' ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-black text-sm mb-1 ${role === 'Admin' ? 'text-orange-600' : 'text-gray-700'}`}>Admin</p>
                  <p className="text-[11px] text-gray-400 leading-snug">Create tests, manage questions & users</p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                    Requires Approval
                  </span>
                </button>
              </div>

              {/* Dynamic hint based on role */}
              {role === 'Admin' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Admin accounts require <strong>Super Admin approval</strong> before you can log in. You'll be notified once approved.
                  </p>
                </div>
              )}
              {role === 'Student' && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                    Student accounts are <strong>activated instantly</strong>. You can log in right after signing up!
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
