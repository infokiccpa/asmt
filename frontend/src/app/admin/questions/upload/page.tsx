"use client";
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, UploadCloud, XCircle } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';

type ParsedQuestion = {
  rowNumber: number;
  isValid: boolean;
  validationErrors: string[];
  normalizedQuestion: {
    text: string;
    type: string;
    subject?: string;
    difficulty?: string;
    options?: { text: string; isCorrect: boolean }[];
    tags?: string[];
  };
};

type PreviewResponse = {
  previewId: string;
  sourceType: string;
  originalFileName: string;
  status: string;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  parsedQuestions: ParsedQuestion[];
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export default function BulkQuestionUploadPage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'valid-only' | 'all-or-nothing'>('valid-only');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handlePreviewUpload = async () => {
    if (!selectedFile || !user?.token) {
      setError('Choose a CSV, Excel, or JSON file to preview.');
      return;
    }

    setIsPreviewing(true);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data } = await axios.post(`${API_BASE_URL}/api/questions/import/preview`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setPreview(data);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Unable to preview this upload.'));
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !user?.token) {
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/questions/import/commit`, {
        previewId: preview.previewId,
        importMode
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setSuccessMessage(`Imported ${data.importedCount} question(s). Skipped ${data.skippedCount} invalid row(s).`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Unable to import questions.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ProtectedRoute roles={['Admin', 'Super Admin', 'Content Manager']}>
      <div className="flex min-h-screen bg-transparent">
        <Sidebar isAdmin={true} />
        <div className="ml-16 flex-1 p-10 animate-fade-in-up">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/admin/questions" className="mb-4 inline-flex items-center text-sm font-semibold text-gray-500 transition-colors hover:text-secondary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Question Bank
              </Link>
              <h1 className="text-3xl font-black tracking-tight text-secondary">Bulk Question Upload</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-500">
                Upload a `.csv`, `.xlsx`, or `.json` file, inspect parsed questions, and import only the rows that pass validation.
              </p>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
            <section className="glass-panel rounded-2xl border-white/20 p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-secondary">Upload Source File</h2>
                  <p className="text-sm text-gray-500">Supported formats: CSV, Excel, JSON</p>
                </div>
              </div>

              <label className="mb-4 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-secondary/20 bg-white/40 px-6 text-center transition hover:border-secondary/40 hover:bg-white/60">
                <UploadCloud className="mb-4 h-10 w-10 text-secondary" />
                <span className="text-base font-semibold text-secondary">
                  {selectedFile ? selectedFile.name : 'Choose a file for preview'}
                </span>
                <span className="mt-2 text-sm text-gray-500">
                  We parse the first sheet for Excel files and validate each row before import.
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);
                    setPreview(null);
                    setError('');
                    setSuccessMessage('');
                  }}
                />
              </label>

              <div className="mb-6 rounded-2xl bg-slate-900/95 p-4 text-sm text-slate-200">
                <p className="mb-2 font-semibold text-white">Suggested columns</p>
                <p>`text`, `type`, `subject`, `difficulty`, `tags`, `options` or `option1..option4`, `correctAnswer`</p>
              </div>

              <div className="mb-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Import Mode</p>
                <div className="space-y-3">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${importMode === 'valid-only' ? 'border-primary bg-primary/5' : 'border-gray-200/60 bg-white/50'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'valid-only'}
                      onChange={() => setImportMode('valid-only')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-secondary">Valid rows only</p>
                      <p className="text-sm text-gray-500">Imports every valid question and skips the rows with validation errors.</p>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${importMode === 'all-or-nothing' ? 'border-primary bg-primary/5' : 'border-gray-200/60 bg-white/50'}`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'all-or-nothing'}
                      onChange={() => setImportMode('all-or-nothing')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-secondary">All or nothing</p>
                      <p className="text-sm text-gray-500">Blocks the import if even one row is invalid, which is useful for tightly curated banks.</p>
                    </div>
                  </label>
                </div>
              </div>

              {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              {successMessage ? <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div> : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePreviewUpload}
                  disabled={!selectedFile || isPreviewing}
                  className="flex-1 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPreviewing ? 'Generating Preview...' : 'Preview Upload'}
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!preview || isImporting || preview.status === 'imported'}
                  className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {preview?.status === 'imported' ? 'Imported' : isImporting ? 'Importing...' : 'Save to Question Bank'}
                </button>
              </div>
            </section>

            <section className="glass-panel rounded-2xl border-white/20 p-8 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-secondary">Preview & Validation</h2>
                  <p className="text-sm text-gray-500">Review normalized questions before writing anything to MongoDB.</p>
                </div>
                {preview ? (
                  <span className="rounded-full bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    {preview.sourceType.toUpperCase()}
                  </span>
                ) : null}
              </div>

              {preview ? (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white/60 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Total Rows</p>
                      <p className="mt-3 text-3xl font-black text-secondary">{preview.summary.totalRows}</p>
                    </div>
                    <div className="rounded-2xl bg-green-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">Valid Rows</p>
                      <p className="mt-3 text-3xl font-black text-green-700">{preview.summary.validRows}</p>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Invalid Rows</p>
                      <p className="mt-3 text-3xl font-black text-red-700">{preview.summary.invalidRows}</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-200/60">
                    <div className="max-h-[620px] overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-950 text-white">
                          <tr>
                            <th className="px-4 py-3">Row</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Question</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Difficulty</th>
                            <th className="px-4 py-3">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white/60">
                          {preview.parsedQuestions.map((item) => (
                            <tr key={`${preview.previewId}-${item.rowNumber}`} className="border-t border-gray-200/60 align-top">
                              <td className="px-4 py-4 font-semibold text-gray-500">{item.rowNumber}</td>
                              <td className="px-4 py-4">
                                {item.isValid ? (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                    <CheckCircle2 className="h-4 w-4" /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                                    <XCircle className="h-4 w-4" /> Invalid
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <p className="max-w-md font-semibold text-secondary">{item.normalizedQuestion.text || 'Missing question text'}</p>
                                {item.normalizedQuestion.options?.length ? (
                                  <p className="mt-2 text-xs text-gray-500">
                                    {item.normalizedQuestion.options.map((option) => option.isCorrect ? `${option.text} (correct)` : option.text).join(' | ')}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-4 py-4 text-gray-600">{item.normalizedQuestion.type}</td>
                              <td className="px-4 py-4 text-gray-600">{item.normalizedQuestion.subject || '-'}</td>
                              <td className="px-4 py-4 text-gray-600">{item.normalizedQuestion.difficulty || '-'}</td>
                              <td className="px-4 py-4">
                                {item.validationErrors.length ? (
                                  <div className="space-y-2">
                                    {item.validationErrors.map((validationError) => (
                                      <p key={validationError} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                        {validationError}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-green-700">Ready to import</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200/80 bg-white/40 text-center">
                  <FileSpreadsheet className="mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-semibold text-secondary">No preview yet</p>
                  <p className="mt-2 max-w-md text-sm text-gray-500">
                    Upload a source file to inspect the parsed question payload, validation issues, and import totals.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
