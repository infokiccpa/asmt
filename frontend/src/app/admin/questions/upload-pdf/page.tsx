"use client";
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, FileText, UploadCloud, FileImage, Trash2, CheckCircle } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL, PYTHON_API_URL, PYTHON_API_KEY } from '@/config';

type PythonQuestion = {
  id: string;
  question_text: string;
  chapter: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  page: number;
  has_diagram: boolean;
  image_base64: string | null;
  options: string[];
  solution_text: string;
  correct_answer: string;
  step_by_step_solution: string;
};

type PreviewResponse = {
  filename: string;
  status: string;
  questions_extracted: number;
  questions: PythonQuestion[];
  raw_pages: number;
  extraction_method?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) return error.response?.data?.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function SmartPDFUploadPage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const removeQuestion = (id: string) => {
    if (!preview) return;
    const updated = preview.questions.filter(q => q.id !== id);
    setPreview({ ...preview, questions: updated, questions_extracted: updated.length });
  };

  const handleExtract = async () => {
    if (!selectedFile) { setError('Choose a PDF file first.'); return; }
    setIsPreviewing(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const { data } = await axios.post(`${PYTHON_API_URL}/api/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', 'X-API-Key': PYTHON_API_KEY }
      });
      if (data.status === 'error') setError(data.message || 'Error processing PDF');
      else setPreview(data);
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to reach the Python API. Make sure it is running.'));
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !user?.token) return;
    setIsImporting(true); setError(''); setSuccess('');
    try {
      const mapped = preview.questions.map(q => ({
        text: q.question_text + (q.step_by_step_solution ? `\n\nSolution:\n${q.step_by_step_solution}` : ''),
        type: 'MCQ',
        subject: q.chapter,
        difficulty: q.difficulty,
        image: q.image_base64,
        options: q.options.map(opt => ({
          text: opt,
          isCorrect: q.correct_answer
            ? (opt === q.correct_answer || opt.startsWith(q.correct_answer.split(')')[0]))
            : false,
        })),
      }));
      const { data } = await axios.post(`${API_BASE_URL}/api/questions/bulk`, { questions: mapped }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSuccess(`Successfully saved ${data.length} questions to the question bank.`);
      setPreview({ ...preview, status: 'imported' });
    } catch (e) {
      setError(getErrorMessage(e, 'Unable to save questions. Check your connection.'));
    } finally {
      setIsImporting(false);
    }
  };

  // Group questions by subject/chapter
  const grouped: Record<string, PythonQuestion[]> = {};
  if (preview) {
    for (const q of preview.questions) {
      const key = q.chapter?.trim() || 'Uncategorised';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(q);
    }
  }

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin', 'Content Manager']}>
      <div className="flex min-h-screen bg-white">
        <Sidebar isAdmin={true} />
        <div className="ml-16 flex-1 p-8">

          {/* Header */}
          <div className="mb-8">
            <Link href="/admin/questions" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Question Bank
            </Link>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Smart PDF Upload</h1>
            <p className="mt-1 text-sm text-gray-400">Upload a PDF — AI will extract, format and group questions by subject automatically.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">

            {/* ── LEFT: Upload panel ── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm self-start">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Upload PDF File</p>
                  <p className="text-xs text-gray-400">Only .pdf files are supported</p>
                </div>
              </div>

              <label className="flex flex-col items-center justify-center min-h-48 border-2 border-dashed border-orange-200 bg-orange-50/40 rounded-xl cursor-pointer px-6 text-center hover:border-orange-400 hover:bg-orange-50 transition-all mb-4">
                <UploadCloud className="w-10 h-10 text-orange-400 mb-3" />
                <span className="text-sm font-semibold text-gray-700">
                  {selectedFile ? selectedFile.name : 'Choose a PDF file'}
                </span>
                <span className="text-xs text-gray-400 mt-1">AI will parse pages and extract questions</span>
                <input type="file" accept=".pdf" className="hidden" onChange={e => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setPreview(null); setError(''); setSuccess('');
                }} />
              </label>

              {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {success && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleExtract}
                  disabled={!selectedFile || isPreviewing}
                  className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPreviewing ? 'Extracting...' : 'Extract Questions'}
                </button>
                <button
                  onClick={handleImport}
                  disabled={!preview || isImporting || preview.status === 'imported' || preview.questions.length === 0}
                  className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {preview?.status === 'imported' ? '✓ Saved' : isImporting ? 'Saving...' : 'Save to Bank'}
                </button>
              </div>

              {preview && (
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-orange-50 p-3 text-center">
                    <p className="text-2xl font-black text-orange-600">{preview.questions_extracted}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Questions</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-black text-blue-600">{Object.keys(grouped).length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Subjects</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3 text-center">
                    <p className="text-2xl font-black text-green-600">{preview.raw_pages}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pages</p>
                  </div>
                </div>
              )}
              
              {preview && (
                <div className="mt-4 p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Extraction Method</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    (preview as any).extraction_method?.includes('AI') 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {(preview as any).extraction_method || 'Traditional'}
                  </span>
                </div>
              )}
            </div>

            {/* ── RIGHT: Preview panel ── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="mb-5">
                <p className="font-bold text-gray-900 text-lg">Extracted Preview</p>
                <p className="text-sm text-gray-400">Review and remove questions before saving.</p>
              </div>

              {preview ? (
                <div className="space-y-8 max-h-[72vh] overflow-auto pr-1">
                  {Object.entries(grouped).map(([subject, qs], gi) => (
                    <div key={gi}>
                      {/* Subject header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <h3 className="font-black text-gray-900">{subject}</h3>
                        <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                          {qs.length} question{qs.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      {/* Table */}
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-400">
                            <tr>
                              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider w-10">#</th>
                              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">Question & Options</th>
                              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider w-28">Difficulty</th>
                              <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider w-20">Media</th>
                              <th className="px-4 py-2.5 w-12" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {qs.map((item, idx) => {
                              const isCorrect = (opt: string) =>
                                item.correct_answer &&
                                (opt === item.correct_answer || opt.startsWith(item.correct_answer.split(')')[0]));
                              return (
                                <tr key={item.id || idx} className="align-top hover:bg-orange-50/30 transition-colors">
                                  <td className="px-4 py-3 text-xs font-bold text-gray-300">{item.id}</td>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-gray-900 mb-2 text-sm">{item.question_text}</p>
                                    {item.options.length > 0 && (
                                      <div className="grid grid-cols-2 gap-1 mb-2">
                                        {item.options.map((opt, i) => (
                                          <p key={i} className={`text-xs px-2 py-1 rounded ${isCorrect(opt) ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-50 text-gray-500'}`}>
                                            {opt} {isCorrect(opt) && '✓'}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                    {item.image_base64 && (
                                      <a
                                        href={`data:image/png;base64,${item.image_base64}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Click to view full size"
                                      >
                                        <img
                                          src={`data:image/png;base64,${item.image_base64}`}
                                          alt={`Diagram for question ${item.id}`}
                                          className="mt-2 max-w-[300px] max-h-48 object-contain rounded-lg border border-gray-200 hover:border-orange-300 transition-colors cursor-zoom-in"
                                        />
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      item.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                      item.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>{item.difficulty}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.has_diagram
                                      ? <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"><FileImage className="w-3 h-3" /> Diagram</span>
                                      : <span className="text-gray-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => removeQuestion(item.id)}
                                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                      title="Remove question"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {preview.questions.length === 0 && (
                    <p className="text-center py-16 text-gray-400 text-sm">All questions removed. Nothing to save.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[420px] rounded-xl border-2 border-dashed border-gray-100 text-center">
                  <FileText className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="font-semibold text-gray-400">No preview yet</p>
                  <p className="text-sm text-gray-300 mt-1 max-w-sm">Upload a PDF and click Extract Questions to see results here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
