"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { API_BASE_URL } from '@/config';
import { Plus, Trash2, Edit, Send, Download, BarChart3 } from 'lucide-react';

export default function TestList() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/tests`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setTests(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchTests();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await axios.delete(`${API_BASE_URL}/api/tests/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setTests(tests.filter((t: any) => t._id !== id));
    }
  };

  const togglePublish = async (test: any) => {
    try {
      const { data } = await axios.put(`${API_BASE_URL}/api/tests/${test._id}`, 
        { isPublished: !test.isPublished },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setTests(tests.map((t: any) => t._id === test._id ? data : t));
    } catch (err: any) {
      alert(`Failed to update test: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleExport = async (testId: string, testTitle: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tests/${testId}/export`, {
        headers: { Authorization: `Bearer ${user?.token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${testTitle.replace(/\s+/g, '_')}_results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export results');
    }
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin']}>
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-4 sm:p-10 flex-1 flex flex-col animate-fade-in-up">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Admin Panel</p>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Test Management</h1>
            </div>
            <Link href="/admin/tests/create" className="btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5">
              <Plus className="w-4 h-4" /> Create Test
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Title</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Questions</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tests.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No tests yet. Click Create Test to get started.</td></tr>
                )}
                {tests.map((t: any) => (
                  <tr key={t._id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{t.title}</td>
                    <td className="px-6 py-4 text-gray-500">{t.duration} mins</td>
                    <td className="px-6 py-4 text-gray-500">{t.sections.reduce((acc: number, s: any) => acc + s.questions.length, 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        t.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => togglePublish(t)} title={t.isPublished ? 'Unpublish' : 'Publish'}
                          className={`p-1.5 rounded-lg transition-colors ${t.isPublished ? 'text-gray-400 hover:bg-gray-100' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExport(t._id, t.title)} title="Export Results (CSV)"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => window.location.href = `/admin/monitoring?testId=${t._id}`} title="View Reports"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
