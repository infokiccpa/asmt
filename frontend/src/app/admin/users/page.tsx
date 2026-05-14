"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';
import { Users, Trash2, Mail, Shield, ShieldCheck, User as UserIcon, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setUsers(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setUsers(users.filter((u: any) => u._id !== id));
      } catch (err) {
        alert('Failed to delete user. Make sure you have Super Admin privileges.');
      }
    }
  };
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        
        // Assume first row is header if it contains keywords
        const startIdx = rows[0].toLowerCase().includes('name') ? 1 : 0;
        const usersToUpload = rows.slice(startIdx).map(row => {
          const [name, email, password, role] = row.split(',').map(s => s.trim());
          return { name, email, password: password || 'ICCPA_2026!', role: role || 'Student' };
        }).filter(u => u.name && u.email);

        const { data } = await axios.post(`${API_BASE_URL}/api/users/bulk`, { users: usersToUpload }, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });

        setBulkResult(data);
        
        // Refresh users list
        const { data: updatedUsers } = await axios.get(`${API_BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setUsers(updatedUsers.data);
      } catch (err) {
        alert('Failed to process bulk upload.');
        console.error(err);
      } finally {
        setIsBulkUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin']}>
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-10 flex-1 flex flex-col animate-fade-in-up">
          <header className="mb-10 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-secondary tracking-tight">System Users</h1>
              <p className="text-gray-500 font-medium">Manage student and administrator access</p>
            </div>
            <div className="flex gap-4">
              {user?.role === 'Super Admin' && (
                <label className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-all ${isBulkUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" />
                  {isBulkUploading ? 'Uploading...' : 'Bulk Upload CSV'}
                  <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} />
                </label>
              )}
              <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-bold text-secondary text-sm">{users.length} Total Users</span>
              </div>
            </div>
          </header>

          {bulkResult && (
            <div className="mb-8 p-6 rounded-2xl bg-white border border-gray-100 shadow-xl animate-scale-in">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-secondary">Bulk Upload Summary</h3>
                <button onClick={() => setBulkResult(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-widest">Dismiss</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">{bulkResult.successCount} Successful</p>
                    <p className="text-xs text-emerald-600/70 italic">Users registered successfully</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="text-sm font-bold text-red-700">{bulkResult.errorCount} Errors</p>
                    <p className="text-xs text-red-600/70 italic">Email duplicates or missing data</p>
                  </div>
                </div>
              </div>
              {bulkResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                   {bulkResult.errors.map((err: any, i: number) => (
                     <p key={i} className="text-xs text-red-500 mb-1 font-medium">• {err.email}: {err.message}</p>
                   ))}
                </div>
              )}
            </div>
          )}

          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border-white/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/5 border-b border-gray-100/50">
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">User Profile</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Email Address</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Joined On</th>
                    {user?.role === 'Super Admin' && (
                      <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium italic animate-pulse">
                        Retrieving user directory...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium italic">
                        No users found in the system.
                      </td>
                    </tr>
                  ) : (
                    users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-white/40 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center border border-primary/20">
                              <UserIcon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-bold text-secondary">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            {u.role === 'Super Admin' ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            ) : u.role === 'Admin' ? (
                              <Shield className="w-4 h-4 text-blue-500" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-400" />
                            )}
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              u.role === 'Super Admin' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              u.role === 'Admin' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <Mail className="w-4 h-4 opacity-50" />
                            {u.email}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm text-gray-500 font-medium">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        {user?.role === 'Super Admin' && (
                          <td className="px-8 py-5">
                            <div className="flex justify-center">
                              <button 
                                onClick={() => handleDelete(u._id)}
                                disabled={u.email === user?.email}
                                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
