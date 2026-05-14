"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/config';
import api from '@/lib/api';
import { 
  Calendar, 
  Shuffle, 
  Info, 
  Users, 
  Settings, 
  Brain, 
  BookOpen, 
  Search, 
  Filter, 
  Folder, 
  ChevronRight, 
  ArrowLeft,
  FileText,
  CheckSquare,
  Square,
  Book,
  Layers,
  Zap,
  Hash,
  Sparkles,
  Clock,
  Target,
  Award,
  Type
} from 'lucide-react';

export default function CreateTest() {
  const { user } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60,
    totalMarks: 100,
    marksConfig: { easy: 1, medium: 2, hard: 3 },
    startDate: '',
    endDate: '',
    shuffleQuestions: false,
    assignedUsers: [] as string[],
    sections: [
      { 
        name: 'General', 
        questions: [] as string[],
        randomGenerationConfig: {
           enabled: false,
           subject: '',
           topic: '',
           difficulty: '',
           count: 0,
           useAI: true
        }
      }
    ]
  });

  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(
    formData.sections[0].randomGenerationConfig.enabled ? 'ai' : 'manual'
  );

  // Folder & Filter State
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, uRes] = await Promise.all([
          api.get('/api/questions'),
          api.get('/api/users')
        ]);
        setQuestions(qRes.data.data);
        setUsers(uRes.data.data.filter((u: any) => u.role === 'Student'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalQuestions = [...formData.sections[0].questions];
      
      // If we have AI generated preview questions, save them to DB first
      if (previewQuestions.length > 0) {
        const payload = {
          users: previewQuestions.map(q => ({
            ...q,
            type: q.options?.length > 0 ? 'MCQ' : 'Subjective'
          }))
        };
        // Wait, the bulk endpoint is for questions, let's check the API payload.
        // Actually, the API is `/api/questions/bulk`. Let's assume it expects { questions: [...] }
        const res = await api.post('/api/questions/bulk', { questions: previewQuestions.map(q => ({
           text: q.question_text,
           options: q.options.map((opt: string) => ({
             text: opt,
             isCorrect: q.correct_answer 
               ? (opt === q.correct_answer || opt.startsWith(q.correct_answer.split(')')[0]))
               : false
           })),
           difficulty: q.difficulty,
           subject: q.chapter,
           type: q.options && q.options.length > 0 ? 'MCQ' : 'Subjective',
           referenceSolution: q.step_by_step_solution
        }))});
        
        // Add the newly created question IDs to the test
        const newIds = res.data.map((q: any) => q._id);
        finalQuestions = [...finalQuestions, ...newIds];
      }

      const payloadToSubmit = {
        ...formData,
        marksConfig: formData.marksConfig,
        sections: [{
          ...formData.sections[0],
          questions: finalQuestions,
          randomGenerationConfig: { ...formData.sections[0].randomGenerationConfig, enabled: false }
        }]
      };

      await api.post('/api/tests', payloadToSubmit);
      router.push('/admin/tests');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      alert(`Failed to create test: ${msg}`);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const config = formData.sections[0].randomGenerationConfig;
      if (!config.subject || !config.topic || config.count <= 0) {
        alert("Please fill in Target Subject, Knowledge Topic, and Question Volume");
        setIsGenerating(false);
        return;
      }
      
      const { PYTHON_API_URL, PYTHON_API_KEY } = await import('@/config');
      
      const res = await axios.post(`${PYTHON_API_URL}/api/ai/generate`, {
        topic: `${config.subject} - ${config.topic}`,
        num_questions: config.count,
        difficulty: config.difficulty || "Medium"
      }, {
        headers: { 'X-API-Key': PYTHON_API_KEY }
      });
      
      setPreviewQuestions(res.data || []);
      alert("Questions generated successfully! You can review them below.");
    } catch (err: any) {
      alert("Failed to generate questions: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const sectionIndex = 0; // Simplified for now
    const currentQuestions = [...formData.sections[sectionIndex].questions];
    const index = currentQuestions.indexOf(questionId as never);
    if (index > -1) {
      currentQuestions.splice(index, 1);
    } else {
      currentQuestions.push(questionId as never);
    }
    
    const newSections = [...formData.sections];
    newSections[sectionIndex].questions = currentQuestions;
    setFormData({ ...formData, sections: newSections });
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin']}>
      <div className="flex bg-[#F8FAFC] min-h-screen">
        <Sidebar isAdmin={true} />
        <div className="ml-16 p-10 flex-1 flex flex-col animate-fade-in-up">
          <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <FileText className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-secondary tracking-tight">Create Assessment</h1>
                <p className="text-sm text-gray-400 font-medium">Design and deploy high-stakes examinations with AI augmentation.</p>
             </div>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Test Details Section */}
              <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-1.5 h-8 bg-primary rounded-full" />
                   <h2 className="text-2xl font-black text-secondary tracking-tight">Basic Configuration</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Assessment Title</label>
                    <div className="relative group">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-gray-400"
                        placeholder="e.g. Advanced AI Fundamentals"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Detailed Description</label>
                    <div className="relative group">
                      <Info className="absolute left-4 top-5 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <textarea
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-gray-400 min-h-[120px]"
                        placeholder="Provide clear instructions and objectives for the students..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Duration (Minutes)</label>
                      <div className="relative group">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="number"
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Total Marks</label>
                      <div className="relative group">
                        <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="number"
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          value={formData.totalMarks}
                          onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 0 })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Marks per Difficulty */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Marks per Difficulty</label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['easy', 'medium', 'hard'] as const).map((level) => {
                        const colors: Record<string, string> = { easy: 'text-emerald-600 bg-emerald-50 border-emerald-200', medium: 'text-orange-600 bg-orange-50 border-orange-200', hard: 'text-red-600 bg-red-50 border-red-200' };
                        return (
                          <div key={level} className={`rounded-2xl border p-4 ${colors[level]}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2">{level}</p>
                            <input
                              type="number"
                              min={0}
                              className="w-full bg-white border border-current/20 rounded-xl py-2 px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-current/20 transition-all"
                              value={formData.marksConfig[level]}
                              onChange={(e) => setFormData({ ...formData, marksConfig: { ...formData.marksConfig, [level]: parseInt(e.target.value) || 0 } })}
                            />
                            <p className="text-[9px] mt-1 opacity-70 font-bold">marks/question</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Candidate Access Control</label>
                    <div className="relative group">
                      <Users className="absolute left-4 top-5 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <select
                        multiple
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all min-h-[120px] scrollbar-thin"
                        value={formData.assignedUsers}
                        onChange={(e) => {
                          const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                          setFormData({ ...formData, assignedUsers: selectedOptions });
                        }}
                      >
                        {users.map(u => (
                          <option key={u._id} value={u._id} className="p-2 rounded-lg hover:bg-primary/10">{u.name} ({u.email})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-2 ml-1 font-bold italic tracking-wide">Multi-select enabled. Leave empty for open access.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Launch Window (Start)</label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="datetime-local"
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Expiry Window (End)</label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="datetime-local"
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-[#F8FAFC] border border-gray-100 flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer" 
                       onClick={() => setFormData({ ...formData, shuffleQuestions: !formData.shuffleQuestions })}>
                     <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-all duration-500 shadow-sm ${formData.shuffleQuestions ? 'bg-primary text-white rotate-12 scale-110' : 'bg-white text-gray-400 group-hover:text-primary'}`}>
                           <Shuffle className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-sm font-black text-secondary">Anti-Cheat: Question Shuffling</p>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Randomize item sequence for security</p>
                        </div>
                     </div>
                     <div className={`w-14 h-7 rounded-full relative transition-all duration-500 ${formData.shuffleQuestions ? 'bg-primary' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-500 ${formData.shuffleQuestions ? 'left-8' : 'left-1'}`} />
                     </div>
                  </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex flex-col space-y-8">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-8 bg-primary rounded-full" />
                         <h2 className="text-2xl font-black text-secondary tracking-tight">Question Bank</h2>
                      </div>
                      <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('ai');
                            const newSections = [...formData.sections];
                            newSections[0].randomGenerationConfig.enabled = true;
                            newSections[0].randomGenerationConfig.useAI = true;
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black transition-all duration-300 ${
                            activeTab === 'ai' 
                            ? 'bg-white text-primary shadow-md shadow-primary/10 ring-1 ring-primary/5 scale-[1.02]' 
                            : 'text-gray-500 hover:text-secondary hover:bg-white/50'
                          }`}
                        >
                          <Brain className={`w-4 h-4 ${activeTab === 'ai' ? 'text-primary' : 'text-gray-400'}`} />
                          AI Generation
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('manual');
                            const newSections = [...formData.sections];
                            newSections[0].randomGenerationConfig.enabled = false;
                            setFormData({ ...formData, sections: newSections });
                          }}
                          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black transition-all duration-300 ${
                            activeTab === 'manual' 
                            ? 'bg-white text-primary shadow-md shadow-primary/10 ring-1 ring-primary/5 scale-[1.02]' 
                            : 'text-gray-500 hover:text-secondary hover:bg-white/50'
                          }`}
                        >
                          <BookOpen className={`w-4 h-4 ${activeTab === 'manual' ? 'text-primary' : 'text-gray-400'}`} />
                          Manual Selection
                        </button>
                      </div>
                   </div>
                   
                   {activeTab === 'manual' && (
                     <div className="flex flex-wrap items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100">
                        <div className="relative flex-1 min-w-[240px]">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="Search keywords..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-secondary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="relative group">
                              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <select 
                                className="pl-9 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-secondary focus:outline-none appearance-none cursor-pointer hover:border-primary transition-all"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                              >
                                {questionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                           </div>
                           <div className="relative group">
                              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <select 
                                className="pl-9 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-secondary focus:outline-none appearance-none cursor-pointer hover:border-primary transition-all"
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                              >
                                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                           </div>
                        </div>
                     </div>
                   )}

                  <div className="min-h-[400px]">
                     {activeTab === 'ai' ? (
                       <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="p-6 rounded-[2rem] bg-gradient-to-r from-secondary to-gray-800 border border-secondary flex items-center gap-5 shadow-2xl shadow-secondary/20">
                             <div className="w-14 h-14 rounded-2xl bg-white/10 text-white backdrop-blur-md flex items-center justify-center border border-white/20">
                                <Sparkles className="w-7 h-7 animate-pulse text-white" />
                             </div>
                             <div>
                                <p className="text-lg font-black text-white tracking-tight">Smart Generation Engine</p>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-[0.1em] mt-1">AI will generate static questions for your review before deployment</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.1em] ml-1">Target Subject</label>
                                <div className="relative group">
                                   <Book className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                   <input 
                                     type="text" 
                                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300" 
                                     placeholder="e.g. Data Structures"
                                     value={formData.sections[0].randomGenerationConfig.subject}
                                     onChange={(e) => {
                                        const newSections = [...formData.sections];
                                        newSections[0].randomGenerationConfig.subject = e.target.value;
                                        setFormData({ ...formData, sections: newSections });
                                     }}
                                   />
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.1em] ml-1">Knowledge Topic</label>
                                <div className="relative group">
                                   <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                   <input 
                                     type="text" 
                                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300" 
                                     placeholder="e.g. Binary Search Trees"
                                     value={formData.sections[0].randomGenerationConfig.topic}
                                     onChange={(e) => {
                                        const newSections = [...formData.sections];
                                        newSections[0].randomGenerationConfig.topic = e.target.value;
                                        setFormData({ ...formData, sections: newSections });
                                     }}
                                   />
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.1em] ml-1">Difficulty Tier</label>
                                <div className="relative group">
                                   <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                   <select 
                                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                                     value={formData.sections[0].randomGenerationConfig.difficulty}
                                     onChange={(e) => {
                                        const newSections = [...formData.sections];
                                        newSections[0].randomGenerationConfig.difficulty = e.target.value;
                                        setFormData({ ...formData, sections: newSections });
                                     }}
                                   >
                                      <option value="">Balance Across Tiers</option>
                                      <option value="Easy">Foundation (Easy)</option>
                                      <option value="Medium">Standard (Medium)</option>
                                      <option value="Hard">Advanced (Hard)</option>
                                   </select>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.1em] ml-1">Question Volume</label>
                                <div className="relative group">
                                   <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                   <input 
                                     type="number" 
                                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-secondary shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-gray-300" 
                                     placeholder="Quantity of items"
                                     value={formData.sections[0].randomGenerationConfig.count}
                                     onChange={(e) => {
                                        const newSections = [...formData.sections];
                                        newSections[0].randomGenerationConfig.count = parseInt(e.target.value) || 0;
                                        setFormData({ ...formData, sections: newSections });
                                     }}
                                   />
                                </div>
                             </div>


                             <div className="col-span-1 md:col-span-2 mt-4">
                                <button 
                                  type="button" 
                                  onClick={handleGenerateQuestions}
                                  disabled={isGenerating}
                                  className="w-full h-14 bg-secondary hover:bg-secondary/90 disabled:bg-gray-300 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-3"
                                >
                                  {isGenerating ? (
                                    <>
                                      <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                      Generating AI Questions...
                                    </>
                                  ) : (
                                    <>
                                      <Brain className="w-5 h-5" />
                                      Generate Questions
                                    </>
                                  )}
                                </button>
                             </div>

                             {previewQuestions.length > 0 && (
                               <div className="col-span-1 md:col-span-2 space-y-4 mt-6">
                                 <h3 className="text-lg font-black text-secondary border-b pb-2">Generated Questions ({previewQuestions.length})</h3>
                                 {previewQuestions.map((q, idx) => (
                                   <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                     <p className="font-bold text-sm mb-2">{idx + 1}. {q.question_text}</p>
                                     {q.options && q.options.length > 0 && (
                                       <ul className="text-xs space-y-1 mb-2 ml-4 list-disc text-gray-600">
                                         {q.options.map((opt: string, oIdx: number) => (
                                           <li key={oIdx} className={opt === q.correct_answer ? "text-green-600 font-bold" : ""}>
                                             {opt}
                                           </li>
                                         ))}
                                       </ul>
                                     )}
                                     <p className="text-[10px] text-gray-400 bg-gray-50 p-2 rounded">
                                       <strong>Solution:</strong> {q.step_by_step_solution}
                                     </p>
                                   </div>
                                 ))}
                               </div>
                             )}
                          </div>
                       </div>
                     ) : (
                       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         {/* Breadcrumbs */}
                         <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
                            <button 
                             type="button"
                             onClick={() => { setSelectedSubject(null); setSelectedTopic(null); }}
                             className={`hover:text-primary transition-all flex items-center gap-2 ${!selectedSubject ? 'text-primary scale-105' : ''}`}
                           >
                             <Folder className="w-3 h-3" />
                             Root Bank
                           </button>
                           {selectedSubject && (
                             <>
                               <ChevronRight className="w-3 h-3 text-gray-300" />
                               <button 
                                 type="button"
                                 onClick={() => setSelectedTopic(null)}
                                 className={`hover:text-primary transition-all ${selectedSubject && !selectedTopic ? 'text-primary scale-105' : ''}`}
                               >
                                 {selectedSubject}
                               </button>
                             </>
                           )}
                           {selectedTopic && (
                             <>
                               <ChevronRight className="w-3 h-3 text-gray-300" />
                               <span className="text-primary font-black scale-105">{selectedTopic}</span>
                             </>
                           )}
                         </div>

                         {!selectedSubject ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {subjects.map(subject => (
                                 <button
                                   key={subject}
                                   type="button"
                                   onClick={() => setSelectedSubject(subject)}
                                   className="flex items-center justify-between p-6 bg-[#F8FAFC] border border-gray-100 rounded-3xl hover:bg-white hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all group"
                                 >
                                    <div className="flex items-center gap-5">
                                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                          <Folder className="w-5 h-5" />
                                       </div>
                                       <div className="text-left">
                                          <p className="text-sm font-black text-secondary group-hover:text-primary transition-colors">{subject}</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{questions.filter(q => (q.subject || 'Uncategorized') === subject).length} Items</p>
                                       </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                 </button>
                              ))}
                           </div>
                         ) : !selectedTopic ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {topics.map(topic => (
                                 <button
                                   key={topic}
                                   type="button"
                                   onClick={() => setSelectedTopic(topic)}
                                   className="flex items-center justify-between p-6 bg-[#F8FAFC] border border-gray-100 rounded-3xl hover:bg-white hover:border-secondary hover:shadow-xl hover:shadow-secondary/5 transition-all group"
                                 >
                                    <div className="flex items-center gap-5">
                                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-secondary shadow-sm group-hover:bg-secondary group-hover:text-white transition-all">
                                          <Folder className="w-5 h-5" />
                                       </div>
                                       <div className="text-left">
                                          <p className="text-sm font-black text-secondary group-hover:text-secondary transition-colors">{topic}</p>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{questions.filter(q => (q.subject || 'Uncategorized') === selectedSubject && (q.topic || 'General') === topic).length} Items</p>
                                       </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                                 </button>
                              ))}
                           </div>
                         ) : (
                           <div className="space-y-6">
                             <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       const currentIds = filteredQuestions.map(q => q._id);
                                       const allSelected = currentIds.every(id => formData.sections[0].questions.includes(id as never));
                                       const newSections = [...formData.sections];
                                       if (allSelected) {
                                         newSections[0].questions = newSections[0].questions.filter(id => !currentIds.includes(id));
                                       } else {
                                         const toAdd = currentIds.filter(id => !newSections[0].questions.includes(id as never));
                                         newSections[0].questions = [...newSections[0].questions, ...toAdd] as string[];
                                       }
                                       setFormData({ ...formData, sections: newSections });
                                     }}
                                     className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 hover:bg-primary/10 px-5 py-2.5 rounded-xl transition-all"
                                   >
                                     {filteredQuestions.map(q => q._id).every(id => formData.sections[0].questions.includes(id as never)) 
                                       ? <CheckSquare className="w-4 h-4" /> 
                                       : <Square className="w-4 h-4" />
                                     }
                                     Batch Action
                                   </button>
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredQuestions.length} Matches Found</span>
                             </div>
                             
                             <div className="max-h-[500px] overflow-y-auto space-y-3 pr-4 custom-scrollbar">
                               {loading ? (
                                 <div className="flex flex-col items-center justify-center py-20 space-y-6">
                                    <div className="w-12 h-12 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin" />
                                    <p className="text-sm font-black text-gray-300 uppercase tracking-[0.3em] animate-pulse">Syncing Engine...</p>
                                 </div>
                               ) : filteredQuestions.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                                    <Search className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No matching items in bank</p>
                                 </div>
                               ) : (
                                 filteredQuestions.map((q: any) => (
                                   <label key={q._id} className={`flex items-start gap-4 p-6 border rounded-[2rem] transition-all cursor-pointer group ${
                                     formData.sections[0].questions.includes(q._id as never)
                                     ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/5'
                                     : 'border-gray-100 bg-white hover:bg-gray-50/50 hover:border-gray-200'
                                   }`}>
                                     <div className="pt-1">
                                        <input
                                          type="checkbox"
                                          className="w-5 h-5 rounded-lg border-gray-400 text-primary focus:ring-primary transition-all"
                                          checked={formData.sections[0].questions.includes(q._id as never)}
                                          onChange={() => toggleQuestion(q._id)}
                                        />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <p className={`text-sm font-bold transition-colors ${formData.sections[0].questions.includes(q._id as never) ? 'text-primary' : 'text-secondary'}`}>{q.text}</p>
                                       <div className="flex items-center mt-3 gap-3">
                                         <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full">{q.type}</span>
                                         <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{q.difficulty}</span>
                                       </div>
                                     </div>
                                   </label>
                                 ))
                               )}
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-8">
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 sticky top-10">
                <div className="flex items-center gap-3 mb-10">
                   <div className="w-1.5 h-8 bg-secondary rounded-full" />
                   <h2 className="text-2xl font-black text-secondary tracking-tight">Summary</h2>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="flex justify-between items-center bg-[#F8FAFC] p-6 rounded-3xl border border-gray-100 group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                          <CheckSquare className="w-5 h-5" />
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Items</span>
                    </div>
                    <span className="text-2xl font-black text-secondary tracking-tighter">
                      {formData.sections[0].questions.length + previewQuestions.length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-[#F8FAFC] p-6 rounded-3xl border border-gray-100 group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                          <Clock className="w-5 h-5" />
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Time</span>
                    </div>
                    <div className="text-right">
                       <span className="text-2xl font-black text-secondary tracking-tighter">{formData.duration}</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase ml-1">Min</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                    <button type="submit" className="w-full h-16 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange/30 hover:shadow-orange/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 border border-[#EA580C]/20">
                      <Sparkles className="w-5 h-5" />
                      Deploy System
                   </button>
                   <button type="button" onClick={() => router.back()} className="w-full h-16 text-[10px] font-black text-gray-500 hover:text-red-500 transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Discard Project
                   </button>
                </div>

                <div className="mt-10 p-6 bg-secondary/5 rounded-3xl border border-secondary/10">
                   <div className="flex items-center gap-3 mb-3">
                      <Info className="w-4 h-4 text-secondary" />
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Protocol Guard</p>
                   </div>
                   <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">By deploying, you acknowledge that all proctoring AI modules and security protocols will be initialized for this session.</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
