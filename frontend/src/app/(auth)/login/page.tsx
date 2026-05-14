"use client";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden">
      <ParticleBackground />
      {/* ─── Left Panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 relative overflow-hidden flex-col justify-between p-14">
        {/* Decorations */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/10 -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/10 -ml-16 -mb-16" />
        <div className="absolute top-1/2 right-10 w-4 h-4 rounded-full bg-white/30 animate-float" />
        <div className="absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-white/40 animate-float delay-200" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl font-black text-white tracking-tight">Clarity</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Empowering smarter<br />certification journeys
          </h2>
          <p className="text-orange-100 text-lg leading-relaxed max-w-md">
            Your AI-powered assessment portal for creating, delivering, and analyzing tests — all in one place.
          </p>

        </div>

        <p className="relative z-10 text-orange-100/60 text-xs">
          © {new Date().getFullYear()} Clarity. All rights reserved.
        </p>
      </div>

      {/* ─── Right Panel ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <span className="text-xl font-black text-gray-900">Clarity</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Welcome back</h1>
            <p className="text-gray-500 font-medium">Sign in to access your portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-3">
                 <span className="mt-0.5 font-bold">!</span>
                 <span>{errorMsg}</span>
              </div>
            )}
            
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email-input"
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In to Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Contact your administrator
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
