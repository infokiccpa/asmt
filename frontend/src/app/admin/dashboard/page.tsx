"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Activity, Users, BookOpen, Clock, Search, Plus, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { title: 'Total Questions', val: '—', icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { title: 'Active Tests', val: '—', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    { title: 'Total Attempts', val: '—', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
    { title: 'Avg Score', val: '—', icon: BarChart2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [qRes, tRes, aRes] = await Promise.allSettled([
          api.get(`/api/questions`),
          api.get(`/api/tests`),
          api.get(`/api/attempts`),
        ]);

        const questions = qRes.status === 'fulfilled' ? qRes.value.data.data : [];
        const tests = tRes.status === 'fulfilled' ? tRes.value.data.data : [];
        const attempts = aRes.status === 'fulfilled' ? aRes.value.data.data : [];

        const completed = attempts.filter((a: any) => a.score != null);
        const avgScore = completed.length
          ? (completed.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / completed.length).toFixed(1)
          : '—';

        setStats([
          { title: 'Total Questions', val: String(questions.length), icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
          { title: 'Active Tests', val: String(tests.filter((t: any) => t.isPublished).length), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
          { title: 'Total Attempts', val: String(attempts.length), icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
          { title: 'Avg Score', val: avgScore === '—' ? '—' : `${avgScore}`, icon: BarChart2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ]);

        // Recent activity: last 5 completed attempts
        const recent = attempts
          .filter((a: any) => a.status !== 'In-Progress' && a.student && a.test)
          .sort((a: any, b: any) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime())
          .slice(0, 5);
        setActivity(recent);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin']}>
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar isAdmin={true} />

        <div className="ml-16 flex-1 p-8">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between animate-fade-in-up">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Admin Panel</p>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
                <span className="font-semibold text-gray-700">{user?.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-card focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search portal..."
                  className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-48 font-medium"
                />
              </div>
              <Link
                href="/admin/questions"
                className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5"
              >
                <Plus className="w-4 h-4" /> New Question
              </Link>
            </div>
          </header>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`card card-hover p-6 animate-fade-in-up delay-${(i + 1) * 100}`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-11 h-11 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {loading && (
                    <span className="text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">Loading...</span>
                  )}
                </div>
                <p className="text-3xl font-black text-gray-900 mb-1">{stat.val}</p>
                <p className="text-sm font-semibold text-gray-500">{stat.title}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="card p-6 animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="accent-bar h-6" />
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Recent Activity
                </h2>
              </div>
              <Link href="/admin/monitoring" className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors px-3 py-1.5 hover:bg-orange-50 rounded-lg">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-10 text-center text-gray-400 text-sm animate-pulse">Loading activity...</div>
              ) : activity.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No recent activity found.</div>
              ) : (
                activity.map((item, i) => {
                  const score = item.score != null ? `${item.score}%` : '—';
                  const passed = item.score != null ? item.score >= 60 : null;
                  const when = timeAgo(item.submittedAt || item.createdAt);
                  const name: string = item.student?.name || 'Unknown';
                  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{name}</p>
                          <p className="text-xs text-gray-500 font-medium">
                            Completed {item.test?.title || 'a test'} · {when}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {score !== '—' && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            passed
                              ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                              : 'text-red-500 bg-red-50 border border-red-100'
                          }`}>
                            {score}
                          </span>
                        )}
                        <Link
                          href={`/admin/monitoring/${item._id}`}
                          className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          View Report
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
