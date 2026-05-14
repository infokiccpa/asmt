"use client";
import { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Play, Sparkles, BookOpen, Search, Clock, ChevronRight, Zap, CheckCircle, RotateCcw } from 'lucide-react';

type TestStatus = 'not-started' | 'in-progress' | 'completed';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [testsRes, attemptsRes] = await Promise.allSettled([
          api.get('/api/tests'),
          api.get('/api/attempts'),
        ]);
        if (testsRes.status === 'fulfilled') setTests(testsRes.value.data.data);
        if (attemptsRes.status === 'fulfilled') setAttempts(attemptsRes.value.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [user]);

  const getTestStatus = (testId: string): TestStatus => {
    const testAttempts = attempts.filter((a: any) => {
      const tid = typeof a.test === 'object' ? a.test?._id : a.test;
      return tid === testId;
    });
    if (testAttempts.some((a: any) => a.status === 'Completed' || a.status === 'Auto-Submitted')) return 'completed';
    if (testAttempts.some((a: any) => a.status === 'In-Progress')) return 'in-progress';
    return 'not-started';
  };

  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests;
    const q = searchQuery.toLowerCase();
    return tests.filter((t: any) =>
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [tests, searchQuery]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const statusBadge = (status: TestStatus) => {
    if (status === 'completed') return (
      <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
        <CheckCircle className="w-3 h-3" /> Completed
      </span>
    );
    if (status === 'in-progress') return (
      <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
        <RotateCcw className="w-3 h-3" /> In Progress
      </span>
    );
    return null;
  };

  return (
    <ProtectedRoute roles={['Student']}>
      <div className="flex bg-gray-50/50 min-h-screen">
        <Sidebar isAdmin={false} />
        <div className="ml-16 flex-1 p-8">

          {/* Header Banner */}
          <header className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 p-8 animate-fade-in-up">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5 -mb-10" />
            <div className="absolute top-4 right-40 w-3 h-3 rounded-full bg-white/40 animate-float" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-semibold flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  {greeting}
                </p>
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">{user?.name}</h1>
                <p className="text-orange-100 text-sm max-w-md leading-relaxed">
                  You have <span className="font-bold text-white">{tests.length} {tests.length === 1 ? 'test' : 'tests'}</span> available. Ready to challenge yourself today?
                </p>
              </div>
              <div className="hidden lg:flex flex-col items-center bg-white/15 backdrop-blur rounded-2xl p-5 border border-white/20 text-center min-w-[100px]">
                <span className="text-4xl font-black text-white">{tests.length}</span>
                <span className="text-orange-100 text-xs font-bold uppercase tracking-wider mt-1">Tests</span>
              </div>
            </div>
          </header>

          {/* Section header */}
          <div className="flex items-center justify-between mb-6 animate-fade-in-up delay-100">
            <div className="flex items-center gap-3">
              <div className="accent-bar h-6" />
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Available Quizzes
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-card focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-40 font-medium"
              />
            </div>
          </div>

          {/* Tests grid or empty */}
          {filteredTests.length === 0 ? (
            <div className="card p-16 flex flex-col items-center justify-center text-center animate-fade-in-up delay-200">
              <div className="w-20 h-20 bg-orange-50 border-2 border-orange-100 border-dashed rounded-2xl flex items-center justify-center mb-5">
                <BookOpen className="w-9 h-9 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {searchQuery ? 'No tests match your search' : 'No tests available right now'}
              </h3>
              <p className="text-gray-500 max-w-sm leading-relaxed text-sm">
                {searchQuery ? 'Try a different keyword.' : 'Check back later. Your administrator will assign new assessments to your group.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in-up delay-200">
              {filteredTests.map((test: any) => {
                const status = getTestStatus(test._id);
                return (
                  <div
                    key={test._id}
                    className="card card-hover p-6 cursor-pointer group relative overflow-hidden"
                    onClick={() => window.location.href = `/student/test/${test._id}`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="badge-orange">Assessment</span>
                        {statusBadge(status)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Clock className="w-3 h-3" />
                        {test.duration} min
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-500 transition-colors mb-2 line-clamp-1">
                      {test.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-5">
                      {test.description || 'Take this comprehensive assessment to validate your knowledge.'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                        {test.sections?.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0) || '—'} questions
                      </div>

                      <button className={`flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all group-hover:shadow-orange ${
                        status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' :
                        status === 'in-progress' ? 'bg-blue-500 hover:bg-blue-600' :
                        'bg-orange-500 hover:bg-orange-600'
                      }`}>
                        {status === 'completed' ? (
                          <><CheckCircle className="w-3.5 h-3.5" /> Review</>
                        ) : status === 'in-progress' ? (
                          <><Play className="w-3.5 h-3.5" /> Resume</>
                        ) : (
                          <><Zap className="w-3.5 h-3.5" /> Start Test<ChevronRight className="w-3 h-3" /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
