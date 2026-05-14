"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertCircle, User, History, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import Link from 'next/link';

export default function AdminMonitoring() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading Monitoring...</div>}>
      <MonitoringContent />
    </Suspense>
  );
}

function MonitoringContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');
  const [violations, setViolations] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for violations in In-Progress attempts
    let q = query(
      collection(db, 'attempts'),
      where('status', '==', 'In-Progress')
    );

    if (testId) {
      q = query(q, where('test', '==', testId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allViolations: any[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.violations && data.violations.length > 0) {
          data.violations.forEach((v: any) => {
            allViolations.push({
              attemptId: doc.id,
              studentName: data.studentName || 'Student', // In Firestore we might need to store studentName directly for efficiency
              ...v
            });
          });
        }
      });
      // Sort by timestamp descending
      setViolations(allViolations.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
    });

    const fetchHistorical = async () => {
      try {
        let histQ = query(
          collection(db, 'attempts'),
          where('status', '==', 'Completed'),
          limit(20)
        );
        if (testId) histQ = query(histQ, where('test', '==', testId));
        
        const snap = await getDocs(histQ);
        setAttempts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistorical();

    return () => unsubscribe();
  }, [user, testId]);

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin']}>
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-10 flex-1 flex flex-col animate-fade-in-up">
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-secondary">Live Monitoring</h1>
            <p className="text-gray-600">Real-time proctoring alerts and student activity</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="glass-panel rounded-xl overflow-hidden shadow-lg border-white/20 animate-fade-in-up delay-100">
                <div className="p-4 bg-[#00152B]/5 border-b border-gray-200/50 flex justify-between items-center">
                  <h2 className="font-bold text-secondary">Violation Log</h2>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">Live</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {violations.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">No violations detected yet</div>
                  ) : (
                    violations.map((v, i) => (
                      <Link href={`/admin/monitoring/${v.attemptId}`} key={i} className="p-4 flex items-start hover:bg-red-50 transition animate-in fade-in duration-500 border-b border-gray-100 last:border-none group">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-4 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-secondary group-hover:text-primary transition-colors">{v.studentName}</p>
                          <p className="text-sm text-red-600 font-medium">{v.type}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {v.timestamp?.toDate ? v.timestamp.toDate().toLocaleTimeString() : new Date(v.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100" />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl shadow-lg border-white/20 animate-fade-in-up delay-300">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-secondary/50" />
                <h3 className="font-bold text-secondary">Historical Reports</h3>
              </div>
              <div className="space-y-4">
                {attempts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No completed sessions yet.</p>
                ) : (
                  attempts.map(a => (
                    <Link href={`/admin/monitoring/${a.id}`} key={a.id} className="flex items-center group">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-primary/10 transition-colors">
                        <User className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-secondary group-hover:text-primary transition-colors">{a.studentName || 'Student'}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">{a.testTitle || 'Test Session'}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
