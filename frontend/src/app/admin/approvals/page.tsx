"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { CheckCircle, XCircle, Clock, Users, RefreshCw } from 'lucide-react';

export default function ApprovalsPage() {
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/users/pending-admins');
      setPendingAdmins(data);
    } catch (err) {
      showToast('Failed to load pending admins.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const { data } = await api.patch(`/api/users/${id}/approve`);
      showToast(data.message, 'success');
      setPendingAdmins(prev => prev.filter(u => u._id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to reject and remove ${name}'s admin request?`)) return;
    setProcessingId(id);
    try {
      const { data } = await api.patch(`/api/users/${id}/reject`);
      showToast(data.message, 'success');
      setPendingAdmins(prev => prev.filter(u => u._id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reject.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ProtectedRoute roles={['Super Admin']}>
      <div className="flex bg-gray-50/50 min-h-screen">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-10 flex-1 animate-fade-in-up">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-3 transition-all ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {toast.msg}
            </div>
          )}

          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-black text-secondary tracking-tight">Admin Approvals</h1>
              <p className="text-gray-400 font-medium mt-1">Review and approve pending admin account registrations.</p>
            </div>
            <button onClick={fetchPending} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-secondary transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : pendingAdmins.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-black text-secondary mb-2">All Clear!</h2>
              <p className="text-gray-400 font-medium">No pending admin approvals at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAdmins.map((admin) => (
                <div key={admin._id} className="glass-panel p-6 rounded-2xl flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-black text-orange-500">{admin.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-secondary">{admin.name}</p>
                      <p className="text-sm text-gray-400">{admin.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-orange-400" />
                        <span className="text-xs font-medium text-orange-500">Pending Since: {new Date(admin.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(admin._id)}
                      disabled={processingId === admin._id}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(admin._id, admin.name)}
                      disabled={processingId === admin._id}
                      className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
