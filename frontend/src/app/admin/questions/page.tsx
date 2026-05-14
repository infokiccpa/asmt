"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  Edit, 
  UploadCloud, 
  Folder, 
  ChevronRight, 
  FileText, 
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';

type Question = {
  _id: string;
  text: string;
  type: string;
  subject?: string;
  topic?: string;
  image?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
};

export default function QuestionList() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data } = await api.get(`/api/questions`);
        setQuestions(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchQuestions();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await api.delete(`/api/questions/${id}`);
        setQuestions(questions.filter((q) => q._id !== id));
      } catch (err) {
        console.error(err);
        alert('Failed to delete question');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL ${questions.length} questions from the bank? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure? This will permanently delete every question.')) return;
    try {
      const ids = questions.map(q => q._id);
      await api.post(`/api/questions/bulk-delete`, { ids });
      setQuestions([]);
      setSelectedSubject(null);
      setSelectedTopic(null);
    } catch (err) {
      console.error('Failed to delete all questions', err);
      alert('Some questions could not be deleted. Please try again.');
    }
  };

  // Derive unique subjects
  const subjects = Array.from(new Set(questions.map(q => q.subject || 'Uncategorized'))).sort();

  // Derive unique topics for selected subject
  const topics = selectedSubject 
    ? Array.from(new Set(
        questions
          .filter(q => (q.subject || 'Uncategorized') === selectedSubject)
          .map(q => q.topic || 'General')
      )).sort()
    : [];

  // Filter questions for final list
  const filteredQuestions = questions.filter(q => {
    const matchesSubject = !selectedSubject || (q.subject || 'Uncategorized') === selectedSubject;
    const matchesTopic = !selectedTopic || (q.topic || 'General') === selectedTopic;
    const matchesType = typeFilter === 'All' || q.type === typeFilter;
    const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesTopic && matchesType && matchesDifficulty && matchesSearch;
  });

  const questionTypes = ['All', 'MCQ', 'True/False', 'Subjective', 'Coding'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin', 'Content Manager']}>
      <div className="flex min-h-screen bg-gray-50/50">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-4 sm:p-8 flex-1 flex flex-col animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Admin Panel</p>
                <ChevronRight className="w-3 h-3 text-gray-300" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question Bank</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {selectedTopic ? selectedTopic : selectedSubject ? selectedSubject : 'Question Bank'}
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/questions/upload-pdf" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98]">
                <UploadCloud className="w-4 h-4" />
                Smart PDF Upload
              </Link>
              <Link href="/admin/questions/upload" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-all duration-200 active:scale-[0.98]">
                <UploadCloud className="w-4 h-4" />
                Bulk Upload
              </Link>
              <Link href="/admin/questions/create" className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
                <Plus className="w-4 h-4" /> Add Question
              </Link>
              {questions.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all duration-200 active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All ({questions.length})
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumbs & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
              <button 
                onClick={() => { setSelectedSubject(null); setSelectedTopic(null); }}
                className={`hover:text-orange-600 transition-colors ${!selectedSubject ? 'font-bold text-orange-600' : ''}`}
              >
                All Subjects
              </button>
              {selectedSubject && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <button 
                    onClick={() => setSelectedTopic(null)}
                    className={`hover:text-orange-600 transition-colors ${selectedSubject && !selectedTopic ? 'font-bold text-orange-600' : ''}`}
                  >
                    {selectedSubject}
                  </button>
                </>
              )}
              {selectedTopic && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <span className="font-bold text-orange-600">{selectedTopic}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search questions..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {questionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select 
                  className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {!selectedSubject ? (
              /* Subjects Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {subjects.length > 0 ? (
                  subjects.map(subject => (
                    <button
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className="group flex flex-col p-6 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5 transition-all duration-200 text-left"
                    >
                      <div className="w-12 h-12 mb-4 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                        <Folder className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{subject}</h3>
                      <p className="text-sm text-gray-500">
                        {questions.filter(q => (q.subject || 'Uncategorized') === subject).length} Questions
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                      <Folder className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No subjects found</h3>
                    <p className="text-gray-500">Start by adding a new question or uploading a PDF.</p>
                  </div>
                )}
              </div>
            ) : !selectedTopic ? (
              /* Topics Grid */
              <div>
                <button 
                  onClick={() => setSelectedSubject(null)}
                  className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Subjects
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {topics.length > 0 ? (
                    topics.map(topic => (
                      <button
                        key={topic}
                        onClick={() => setSelectedTopic(topic)}
                        className="group flex flex-col p-6 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200 text-left"
                      >
                        <div className="w-12 h-12 mb-4 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <Folder className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">{topic}</h3>
                        <p className="text-sm text-gray-500">
                          {questions.filter(q => (q.subject || 'Uncategorized') === selectedSubject && (q.topic || 'General') === topic).length} Questions
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No chapters found</h3>
                      <p className="text-gray-500">There are no chapters categorized in this subject.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Questions List */
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                   <button 
                    onClick={() => setSelectedTopic(null)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Chapters
                  </button>
                  <span className="text-xs font-bold text-gray-400 uppercase">{filteredQuestions.length} Questions Found</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Question</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Type</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Difficulty</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.length > 0 ? (
                        filteredQuestions.map((q) => (
                          <tr key={q._id} className="border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-lg bg-gray-50 text-gray-400 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 max-w-md">
                                  <div className="truncate font-medium text-gray-700 mb-2" title={q.text}>{q.text}</div>
                                  {q.image && (
                                    <div className="relative w-full max-w-[200px] rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                                      <img 
                                        src={q.image.startsWith('data:') ? q.image : `data:image/png;base64,${q.image}`} 
                                        alt="Question diagram" 
                                        className="w-full h-auto object-contain max-h-[120px]"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{q.type}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' :
                                q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(q._id)} className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center text-gray-500">
                            No questions match your current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

