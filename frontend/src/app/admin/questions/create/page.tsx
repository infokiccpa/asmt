"use client";
import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config';

export default function CreateQuestion() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    text: '',
    type: 'MCQ',
    subject: '',
    difficulty: 'Medium',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    tags: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/questions`, formData, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      router.push('/admin/questions');
    } catch (err) {
      alert('Failed to create question');
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index].text = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleCorrectChange = (index: number) => {
    const newOptions = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setFormData({ ...formData, options: newOptions });
  };

  const handleTypeChange = (type: string) => {
    let newOptions = [...formData.options];
    if (type === 'True/False') {
      newOptions = [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
      ];
    } else if (type === 'MCQ' && formData.type !== 'MCQ') {
      newOptions = [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ];
    } else if (type === 'Subjective') {
      newOptions = [];
    }
    setFormData({ ...formData, type, options: newOptions });
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin', 'Content Manager']}>
      <div className="flex bg-transparent min-h-screen">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-10 flex-1 flex flex-col animate-fade-in-up">
          <h1 className="text-3xl font-black text-secondary mb-10 tracking-tight">Create Question</h1>
          
          <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl shadow-lg border-white/20 max-w-2xl">
            <h2 className="text-xl font-bold text-secondary mb-8 pr-4 border-l-4 border-primary pl-3">Question Metadata</h2>
            
            <div className="mb-8">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Question Text</label>
              <textarea
                className="w-full bg-white/50 border border-gray-200/50 rounded-xl py-3 px-4 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                rows={3}
                placeholder="What is the primary function of...?"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Question Type</label>
                <select
                  className="w-full bg-white/50 border border-gray-200/50 rounded-xl py-3 px-4 text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium appearance-none"
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <option value="MCQ">Multiple Choice</option>
                  <option value="Subjective">Subjective / Essay</option>
                  <option value="True/False">True / False</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Subject / Chapter</label>
                <input
                  type="text"
                  className="w-full bg-white/50 border border-gray-200/50 rounded-xl py-3 px-4 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                  placeholder="e.g. Physics"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Difficulty Level</label>
                <select
                  className="w-full bg-white/50 border border-gray-200/50 rounded-xl py-3 px-4 text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium appearance-none"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {(formData.type === 'MCQ' || formData.type === 'True/False') && (
              <div className="mb-10">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 pl-1">
                  Options (Select the correct answer)
                </label>
                <div className="space-y-3">
                  {formData.options.map((opt, i) => (
                    <div key={i} className={`flex items-center p-3 border rounded-xl transition-all ${
                      opt.isCorrect ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-gray-100/50 bg-white/30'
                    }`}>
                      <input
                        type="radio"
                        name="correctOption"
                        className="w-5 h-5 text-primary border-gray-300 focus:ring-primary mr-4"
                        checked={opt.isCorrect}
                        onChange={() => handleCorrectChange(i)}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 bg-transparent border-none outline-none text-secondary font-medium placeholder-gray-400"
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        required
                        readOnly={formData.type === 'True/False'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.type === 'Subjective' && (
              <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                       <span className="text-primary font-bold text-xs">i</span>
                    </div>
                    <p className="text-sm font-bold text-secondary">Subjective Question Mode</p>
                 </div>
                 <p className="text-xs text-gray-500 leading-relaxed">
                    Subjective questions do not have predefined options. Students will be provided with a text area to write their detailed responses. 
                    <br/><br/>
                    <strong className="text-secondary font-bold">Note:</strong> These questions will require manual grading by an administrator after the test is submitted.
                 </p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100/50">
              <button type="button" onClick={() => router.back()} className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-secondary transition-colors uppercase tracking-widest">Cancel</button>
              <button type="submit" className="bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98]">
                Save Question
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
