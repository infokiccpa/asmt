"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { CheckCircle, XCircle, ArrowLeft, Award, Percent, Target, Clock } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import Link from 'next/link';

export default function StudentResult() {
  const { id } = useParams();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<any>(null);

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const { data } = await api.get(`/api/attempts/${id}`);
        setAttempt(data);
      } catch (err: any) {
        console.error('Failed to fetch attempt:', err.response?.data?.message || err);
      }
    };
    if (user) fetchAttempt();
  }, [id, user]);

  if (!attempt) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Analyzing Performance...</p>
    </div>
  );

  const totalQuestions = attempt.responses?.length || attempt.test?.sections?.[0]?.questions?.length || 0;
  const correctAnswers = attempt.responses?.filter((r: any) => r.isCorrect)?.length || 0;
  const percentage = totalQuestions > 0 ? (attempt.score / totalQuestions) * 100 : 0;
  const isPassed = percentage >= 40;

  return (
    <ProtectedRoute roles={['Student']}>
      <div className="flex min-h-screen bg-gray-50 relative overflow-hidden">
        <ParticleBackground />
        <Sidebar isAdmin={false} />
        
        <div className="ml-16 flex-1 relative z-10 p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between mb-8 animate-fade-in-up">
              <div>
                <Link href="/student/dashboard" className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-orange-500 transition-colors mb-4 gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Back to Dashboard
                </Link>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Performance Report</h1>
                <p className="text-gray-500 font-medium">{attempt.test.title}</p>
              </div>
              <div className={`px-6 py-2 rounded-2xl font-black text-sm tracking-widest ${
                isPassed ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-500 ring-1 ring-red-200'
              }`}>
                {isPassed ? 'PASSED' : 'FAILED'}
              </div>
            </div>

            {/* ── STATS CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up delay-100">
              <div className="card p-6 flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <Target className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-3xl font-black text-gray-900">{attempt.score}<span className="text-gray-300 text-lg">/{totalQuestions}</span></p>
                </div>
              </div>

              <div className="card p-6 flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <Percent className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Accuracy</p>
                  <p className="text-3xl font-black text-gray-900">{percentage.toFixed(1)}<span className="text-gray-300 text-lg">%</span></p>
                </div>
              </div>

              <div className="card p-6 flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <p className={`text-xl font-black ${isPassed ? 'text-emerald-600' : 'text-red-500'}`}>{isPassed ? 'Certified' : 'Re-attempt Req.'}</p>
                </div>
              </div>
            </div>

            {/* ── DETAILED BREAKDOWN ── */}
            <div className="card overflow-hidden animate-fade-in-up delay-200">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Detailed Question Analysis</h2>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><CheckCircle className="w-3 h-3 text-emerald-500" /> Correct</div>
                   <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><XCircle className="w-3 h-3 text-red-500" /> Incorrect</div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-50">
                {attempt.responses.map((resp: any, i: number) => (
                  <div key={i} className="p-8 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start gap-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs ${
                        resp.isCorrect === true ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        resp.isCorrect === false ? 'bg-red-50 text-red-500 border border-red-100' :
                        'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-gray-900 mb-4">{resp.question.text}</p>
                        
                        <div className={`grid ${resp.question.type === 'Subjective' ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
                          <div className={`p-4 rounded-xl border-2 ${
                            resp.isCorrect === true ? 'bg-emerald-50/50 border-emerald-100' : 
                            resp.isCorrect === false ? 'bg-red-50/50 border-red-100' :
                            'bg-orange-50/50 border-orange-100'
                          }`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400">
                              {resp.question.type === 'Subjective' ? 'Your Response' : 'Your Selection'}
                            </p>
                            <p className={`text-sm font-bold break-words whitespace-pre-wrap ${
                              resp.isCorrect === true ? 'text-emerald-700' : 
                              resp.isCorrect === false ? 'text-red-700' :
                              'text-orange-700'
                            }`}>{resp.answer}</p>
                          </div>
                          
                          {(resp.isCorrect === false && resp.question.type !== 'Subjective') && (
                            <div className="p-4 rounded-xl border-2 bg-emerald-50/50 border-emerald-100">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400">Correct Answer</p>
                              <p className="text-sm font-bold text-emerald-700 break-words">
                                {resp.question.options?.find((o: any) => o.isCorrect)?.text}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1">
                        {resp.isCorrect === true ? (
                          <div className="bg-emerald-500 text-white p-1 rounded-full"><CheckCircle className="w-5 h-5" /></div>
                        ) : resp.isCorrect === false ? (
                          <div className="bg-red-500 text-white p-1 rounded-full"><XCircle className="w-5 h-5" /></div>
                        ) : (
                          <div className="bg-orange-500 text-white p-1 rounded-full"><Clock className="w-5 h-5" /></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 mb-20 text-center">
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                Download Scorecard
              </button>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
