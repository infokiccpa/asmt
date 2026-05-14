"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { 
  Trophy, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Search, 
  Filter, 
  AlertCircle,
  CheckCircle,
  RotateCcw,
  History
} from 'lucide-react';
import Link from 'next/link';

export default function StudentResultsHistory() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const { data } = await api.get('/api/attempts');
        // If the backend returns { data: [...], total: ... }
        if (data && data.data) {
          setAttempts(data.data);
        } else {
          setAttempts(data);
        }
      } catch (err) {
        console.error('Failed to fetch attempts:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAttempts();
  }, [user]);

  const filteredAttempts = attempts.filter(attempt => {
    const matchesSearch = attempt.test?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || attempt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Auto-Submitted':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'In-Progress':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedRoute roles={['Student']}>
      <div className="flex bg-gray-50/50 min-h-screen">
        <Sidebar isAdmin={false} />
        <div className="ml-16 flex-1 p-8">
          
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-orange-500 mb-1">
                <History className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Student Portal</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Your Test History</h1>
              <p className="text-gray-500 font-medium">Track your progress and review your performance across all assessments.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm focus-within:ring-2 focus-within:ring-orange-100 focus-within:border-orange-400 transition-all">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search tests..." 
                  className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="relative group">
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm cursor-pointer hover:bg-gray-50 transition-all">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select 
                    className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 cursor-pointer appearance-none pr-4"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="In-Progress">In Progress</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid/List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Loading history...</p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="card p-20 flex flex-col items-center justify-center text-center animate-fade-in-up">
              <div className="w-20 h-20 bg-orange-50 border-2 border-orange-100 border-dashed rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="w-10 h-10 text-orange-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No results found</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'All' 
                  ? "We couldn't find any attempts matching your current filters. Try adjusting them." 
                  : "You haven't taken any tests yet. Head over to the dashboard to start your first assessment!"}
              </p>
              {!searchQuery && statusFilter === 'All' && (
                <Link href="/student/dashboard" className="mt-8 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange/20 active:scale-[0.98]">
                  Go to Dashboard
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
              {filteredAttempts.map((attempt) => (
                <Link 
                  key={attempt._id} 
                  href={attempt.status === 'In-Progress' ? `/student/test/${attempt.test?._id}` : `/student/results/${attempt._id}`}
                  className="card card-hover p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      attempt.status === 'Completed' || attempt.status === 'Auto-Submitted' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                    }`}>
                      {attempt.status === 'Completed' || attempt.status === 'Auto-Submitted' ? <Trophy className="w-7 h-7" /> : <RotateCcw className="w-7 h-7" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                          {attempt.test?.title || 'Untitled Test'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusStyle(attempt.status)}`}>
                          {attempt.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(attempt.createdAt)}
                        </div>
                        {attempt.endTime && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime || attempt.createdAt).getTime()) / 60000)} min
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {(attempt.status === 'Completed' || attempt.status === 'Auto-Submitted') && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Score</p>
                        <p className="text-2xl font-black text-gray-900">
                          {attempt.score}
                          <span className="text-gray-300 text-sm font-bold ml-1">
                            / {attempt.responses?.length || 0}
                          </span>
                        </p>
                      </div>
                    )}
                    
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-12 p-6 bg-orange-50/50 rounded-2xl border border-orange-100/50 flex gap-4 animate-fade-in-up delay-300">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Performance Insight</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Regularly reviewing your past attempts helps identify patterns in your mistakes. 
                Click on any "Completed" test to see a detailed question-by-question breakdown.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
