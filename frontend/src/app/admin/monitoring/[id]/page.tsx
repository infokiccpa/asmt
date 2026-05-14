"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, Clock, CheckCircle, User, ArrowLeft, Calendar, ShieldAlert } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AttemptReport() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/attempts/${id}`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setAttempt(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user && id) fetchAttempt();
  }, [user, id]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Report...</div>;
  if (!attempt) return <div className="flex h-screen items-center justify-center text-red-500 font-bold">Attempt not found.</div>;

  const startTime = new Date(attempt.startTime);
  const endTime = attempt.endTime ? new Date(attempt.endTime) : new Date();
  const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

  // Prepare Chart Data
  const labels = Array.from({ length: 11 }, (_, i) => `${Math.floor((durationInSeconds / 10) * i)}s`);
  const violationData = labels.map((_, i) => {
    const timePoint = (durationInSeconds / 10) * i;
    const count = attempt.violations ? attempt.violations.filter((v: any) => {
        const vTime = (new Date(v.timestamp).getTime() - startTime.getTime()) / 1000;
        return vTime >= timePoint - (durationInSeconds/20) && vTime <= timePoint + (durationInSeconds/20);
    }).length : 0;
    return count;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Violations Frequency',
        data: violationData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    }
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin']}>
      <div className="flex min-h-screen bg-transparent">
        <Sidebar isAdmin={true} />
        <div className="ml-72 p-10 flex-1 flex flex-col animate-fade-in-up">
          <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-secondary mb-6 transition-colors font-bold text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Monitoring
          </button>

          <header className="mb-10 flex justify-between items-end">
            <div>
              <p className="text-primary font-bold tracking-wider text-xs uppercase mb-2">Detailed Proctoring Report</p>
              <h1 className="text-3xl font-black text-secondary tracking-tight">
                {attempt.student?.name || 'Unknown User'} <span className="text-gray-300 font-light mx-2">/</span> {attempt.test?.title || 'Unknown Test'}
              </h1>
            </div>
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${attempt.violations?.length > 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              <ShieldAlert className="w-5 h-5" />
              <span className="font-bold text-sm">{attempt.violations?.length || 0} Potential Violations</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="glass-panel p-8 rounded-2xl shadow-xl border-white/20">
                <h2 className="text-xl font-bold text-secondary mb-6 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" /> Violation Timeline
                </h2>
                <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>Start: {startTime.toLocaleTimeString()}</span>
                    <span>Elapsed: {Math.floor(durationInSeconds / 60)}m {durationInSeconds % 60}s</span>
                </div>
              </div>

              <div className="glass-panel p-8 rounded-2xl shadow-xl border-white/20">
                <h2 className="text-xl font-bold text-secondary mb-6">Activity Log</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                   {!attempt.violations || attempt.violations.length === 0 ? (
                     <p className="text-center py-10 text-gray-400 italic">No violations recorded during this session.</p>
                   ) : (
                     attempt.violations.map((v: any, i: number) => {
                        const elapsed = Math.floor((new Date(v.timestamp).getTime() - startTime.getTime()) / 1000);
                        return (
                          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/40 border border-gray-100/50 hover:bg-white/60 transition-all">
                             <div className="flex items-center gap-4">
                               <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                 <AlertCircle className="w-4 h-4" />
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-secondary">{v.type}</p>
                                 <p className="text-xs text-gray-400">{new Date(v.timestamp).toLocaleTimeString()}</p>
                               </div>
                             </div>
                             <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded">+{elapsed}s</span>
                          </div>
                        );
                     })
                   )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-8 rounded-2xl shadow-xl border-white/20">
                <h2 className="text-xl font-bold text-secondary mb-6">Subject Statistics</h2>
                <div className="space-y-6">
                  <div className="bg-secondary/5 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Final Score</p>
                    <p className="text-4xl font-black text-secondary">{attempt.score} <small className="text-lg font-bold text-gray-300">/ {attempt.responses?.length || 0}</small></p>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Attempt Status</span>
                    <span className="font-bold text-secondary">{attempt.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Session Duration</span>
                    <span className="font-bold text-secondary">{Math.floor(durationInSeconds / 60)} mins</span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-8 rounded-2xl shadow-xl border-white/20 bg-gradient-to-br from-white/40 to-primary/5">
                <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Student Profile
                </h3>
                <div className="space-y-3">
                   <p className="text-sm font-semibold">{attempt.student?.name || 'Unknown Student'}</p>
                   <p className="text-xs text-gray-500">{attempt.student?.email || 'N/A'}</p>
                   <button className="w-full mt-4 py-3 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-primary transition-all shadow-lg active:scale-95">
                     View All Student's Tests
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
