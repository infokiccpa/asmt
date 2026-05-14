"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  Users, Shield, ShieldAlert, Globe, Server, Activity, 
  UserPlus, CheckCircle, BarChart, TrendingUp, Cpu
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/api/users/system-stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch system stats');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchStats();
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Initializing System Matrix...</p>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-black mb-2">Core Connection Failed</h2>
      <p className="text-gray-500 max-w-md mb-8">The system was unable to establish a secure link to the global stats engine. Please verify backend availability.</p>
      <button onClick={() => window.location.reload()} className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all">Retry Synchronization</button>
    </div>
  );

  return (
    <ProtectedRoute roles={['Super Admin']}>
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar isAdmin={true} />
        
        <div className="ml-16 flex-1 p-8 lg:p-12 animate-fade-in-up">
          
          {/* ── HEADER ── */}
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">System Status: Operational</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Super <span className="text-orange-500">Admin</span> Core</h1>
              <p className="text-gray-500 font-medium text-sm">Real-time infrastructure oversight and global user orchestration.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden xl:flex flex-col items-end mr-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Instance Node</span>
                <span className="text-xs font-mono text-gray-500">AWS-AS-SOUTH-1A</span>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden md:block mx-2" />
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {String.fromCharCode(64+i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
                  +{stats.totals.users}
                </div>
              </div>
            </div>
          </header>

          {/* ── METRIC GRID ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Global Entities', val: stats.totals.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Active Clusters', val: stats.totals.tests, icon: Globe, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
              { label: 'Data Points', val: stats.totals.attempts, icon: Server, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: 'Core Questions', val: stats.totals.questions, icon: Cpu, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            ].map((m, i) => (
              <div key={i} className={`card card-hover p-6 animate-fade-in-up delay-${(i + 1) * 100}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${m.bg} border ${m.border} ${m.color}`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-3xl font-black text-gray-900 mb-1">{m.val}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* ── USER DISTRIBUTION ── */}
            <div className="xl:col-span-2 space-y-8">
              <section className="card overflow-hidden animate-fade-in-up delay-400">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                      <BarChart className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Access Distribution</h2>
                      <p className="text-xs text-gray-500 font-medium">User demographic by authorization level</p>
                    </div>
                  </div>
                  <Link href="/admin/users" className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors">Manage Directory</Link>
                </div>
                <div className="p-8 grid sm:grid-cols-3 gap-8">
                  {stats.usersByRole.map((role: any, i: number) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{role._id}s</span>
                        <span className="text-xl font-black text-gray-900">{role.count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            role._id === 'Super Admin' ? 'bg-emerald-500' : 
                            role._id === 'Admin' ? 'bg-orange-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(role.count / stats.totals.users) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── RECENT NODES (USERS) ── */}
              <section className="card overflow-hidden animate-fade-in-up delay-500">
                <div className="p-8 border-b border-gray-100">
                   <h2 className="text-lg font-bold text-gray-900">Recent Activity Nodes</h2>
                   <p className="text-xs text-gray-500 font-medium">Latest entities added to the global directory</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {stats.recentUsers.map((u: any, i: number) => (
                    <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{u.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                           u.role === 'Super Admin' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           u.role === 'Admin' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                           'bg-blue-50 text-blue-600 border-blue-100'
                         }`}>
                           {u.role.toUpperCase()}
                         </span>
                         <span className="text-[10px] font-semibold text-gray-400 hidden md:block">
                            {new Date(u.createdAt).toLocaleDateString()}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ── QUICK ACTIONS ── */}
            <div className="space-y-8 animate-fade-in-up delay-500">
               <section className="bg-gradient-to-br from-orange-500 to-orange-700 p-8 rounded-3xl shadow-lg shadow-orange-500/20 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-16 -mt-16" />
                  <Shield className="w-8 h-8 mb-6 opacity-40 relative z-10" />
                  <h3 className="text-xl font-black mb-2 tracking-tight relative z-10">Security Protocol</h3>
                  <p className="text-orange-100 text-xs font-medium leading-relaxed mb-8 relative z-10">
                    Elevated permissions active. Ensure all system-wide changes are logged in the secure audit trail.
                  </p>
                  <div className="space-y-3 relative z-10">
                    <Link href="/admin/approvals" className="flex items-center justify-between p-4 bg-white/15 hover:bg-white/25 rounded-2xl transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest">Pending Approvals</span>
                       <Activity className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    </Link>
                    <Link href="/admin/users" className="flex items-center justify-between p-4 bg-white/15 hover:bg-white/25 rounded-2xl transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest">Directory Access</span>
                       <Users className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    </Link>
                  </div>
               </section>

               <section className="card p-8">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">System Health</h4>
                  <div className="space-y-6">
                     {[
                       { label: 'Uptime', val: '99.98%', color: 'text-emerald-500' },
                       { label: 'API Latency', val: '42ms', color: 'text-orange-500' },
                       { label: 'Database Load', val: '14%', color: 'text-blue-500' }
                     ].map((h, i) => (
                       <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-none">
                          <span className="text-xs font-bold text-gray-500">{h.label}</span>
                          <span className={`text-sm font-black ${h.color}`}>{h.val}</span>
                       </div>
                     ))}
                  </div>
               </section>
            </div>

          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
