"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ParticleBackground from '@/components/ParticleBackground';
import { Clock, AlertTriangle, Flag, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import CameraMonitor from '@/components/CameraMonitor';

export default function TestExecution() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [test, setTest]                     = useState<any>(null);
  const [attempt, setAttempt]               = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [timeLeft, setTimeLeft]             = useState(0);
  const [loading, setLoading]               = useState(true);
  const [responses, setResponses]           = useState<Record<string, any>>({});
  const [flagged, setFlagged]               = useState<Set<number>>(new Set());
  const [pendingSave, setPendingSave]       = useState(false);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [violationMessage, setViolationMessage] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTest = useCallback(async () => {
    try {
      const testRes = await api.get(`/api/tests/${id}`);
      setTest(testRes.data);
      setTimeLeft(testRes.data.duration * 60);

      let attemptId;
      try {
        const attemptRes = await api.post(`/api/attempts/start/${id}`, {});
        attemptId = attemptRes.data._id;
      } catch (err: any) {
        if (err.response?.status === 400 && err.response.data.attemptId) {
          attemptId = err.response.data.attemptId;
        } else throw err;
      }

      const populated = await api.get(`/api/attempts/${attemptId}`);
      setAttempt(populated.data);

      const initial: Record<string, any> = {};
      populated.data.responses.forEach((r: any) => {
        if (r.answer) initial[r.question._id] = r.answer;
      });
      setResponses(initial);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(
        err.response?.status === 403
          ? err.response.data.message || 'Access Denied: You are not assigned to this test.'
          : 'Failed to initialize test environment.'
      );
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (user) startTest(); }, [user, startTest]);

  useEffect(() => {
    if (timeLeft > 0) {
      const t = setInterval(() => setTimeLeft(v => v - 1), 1000);
      return () => clearInterval(t);
    } else if (timeLeft === 0 && !loading) {
      submitTest('Auto-Submitted');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, loading]);

  useEffect(() => {
    const onViolation = (type: string) => {
      if (attempt) {
        api.post(`/api/attempts/${attempt._id}/violation`, { type });
        setViolationMessage(type);
      }
    };
    const onVisibility = () => { if (document.hidden) onViolation('tab-switch'); };
    const onBlur = () => onViolation('window-blur');
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [attempt]);

  const persistResponse = useCallback(async (questionId: string, answer: any) => {
    try {
      await api.post(`/api/attempts/${attempt._id}/response`, { questionId, answer });
    } catch { /* silent */ } finally { setPendingSave(false); }
  }, [attempt]);

  const saveResponse = (questionId: string, answer: any, debounce = false) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }));
    if (debounce) {
      setPendingSave(true);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => persistResponse(questionId, answer), 3000);
    } else {
      persistResponse(questionId, answer);
    }
  };

  const submitTest = async (status = 'Completed') => {
    if (status === 'Completed' && !confirm('Are you sure you want to submit your test?')) return;
    try {
      await api.post(`/api/attempts/${attempt._id}/submit`, { status });
      router.push(`/student/results/${attempt._id}`);
    } catch { alert('Failed to submit test'); }
  };

  const toggleFlag = (index: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // ── Loading / error states ──────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Initializing Test Environment...</p>
    </div>
  );

  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-red-500">!</span>
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-500 max-w-md">{errorMsg}</p>
      <button onClick={() => router.push('/student/dashboard')} className="mt-8 btn-primary px-8">Return to Dashboard</button>
    </div>
  );

  if (attempt && attempt.responses.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-orange-500 font-bold">!</div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">No Questions Found</h2>
      <p className="text-gray-500 max-w-md">This test has no questions yet. Please contact your administrator.</p>
      <button onClick={() => router.push('/student/dashboard')} className="mt-8 btn-primary px-8">Return to Dashboard</button>
    </div>
  );

  // ── Derived data ────────────────────────────────────────────────────
  const marksConfig: Record<string, number> = test?.marksConfig || { easy: 1, medium: 2, hard: 3 };
  const getMarks = (q: any) => marksConfig[(q?.difficulty || 'Medium').toLowerCase()] ?? 1;
  const totalCount = attempt.responses.length;
  const answeredCount = attempt.responses.filter((r: any) => !!responses[r.question._id]).length;

  // Build subject → indices map (preserving encounter order)
  const subjectMap: Record<string, number[]> = {};
  attempt.responses.forEach((r: any, i: number) => {
    const subj = r.question?.subject || 'General';
    if (!subjectMap[subj]) subjectMap[subj] = [];
    subjectMap[subj].push(i);
  });
  const subjectList = Object.keys(subjectMap);

  // Indices visible for the selected subject
  const visibleIndices: number[] = selectedSubject
    ? (subjectMap[selectedSubject] || [])
    : attempt.responses.map((_: any, i: number) => i);

  const posInSubject  = visibleIndices.indexOf(currentQuestionIndex);
  const subjectTotal  = visibleIndices.length;

  const goToPrev = () => {
    if (posInSubject > 0) setCurrentQuestionIndex(visibleIndices[posInSubject - 1]);
  };
  const goToNext = () => {
    if (posInSubject < subjectTotal - 1) setCurrentQuestionIndex(visibleIndices[posInSubject + 1]);
  };

  const openSubject = (subj: string) => {
    setSelectedSubject(subj);
    if (subjectMap[subj]?.length) setCurrentQuestionIndex(subjectMap[subj][0]);
  };

  // Chapter grouping within the current subject view
  const chapterMap: Record<string, number[]> = {};
  visibleIndices.forEach(i => {
    const ch = attempt.responses[i].question?.topic || 'General';
    if (!chapterMap[ch]) chapterMap[ch] = [];
    chapterMap[ch].push(i);
  });
  const chapterList = Object.keys(chapterMap);

  const currentQuestionObj = attempt?.responses[currentQuestionIndex]?.question;
  const currentChapter     = currentQuestionObj?.topic || 'General';
  const prevChapter        = posInSubject > 0
    ? (attempt.responses[visibleIndices[posInSubject - 1]].question?.topic || 'General')
    : null;
  const isChapterStart     = posInSubject === 0 || prevChapter !== currentChapter;
  const chapterIndices     = chapterMap[currentChapter] || [];
  const posInChapter       = chapterIndices.indexOf(currentQuestionIndex) + 1;
  const currentAnswer      = currentQuestionObj ? (responses[currentQuestionObj._id] || '') : '';
  const wordCount          = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;

  // ── Shared header ───────────────────────────────────────────────────
  const Header = () => (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex justify-between items-center z-50">
      <div className="flex items-center gap-3">
        <span className="text-xl font-black text-gray-900 tracking-tight">Clarity</span>
        <div className="w-px h-6 bg-gray-200" />
        <h1 className="text-sm font-bold text-gray-600 truncate max-w-[200px] md:max-w-md">{test.title}</h1>
        {selectedSubject && (
          <>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-black text-orange-500 truncate max-w-[160px]">{selectedSubject}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {selectedSubject && (
          <button
            onClick={() => setSelectedSubject(null)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Subjects
          </button>
        )}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-lg ${
          timeLeft < 300 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-orange-50 text-orange-600'
        }`}>
          <Clock className="w-5 h-5" />
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </header>
  );

  // ── Subject selection screen ────────────────────────────────────────
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans relative">
        <ParticleBackground />
        <div className="relative z-10">
          <Header />

          {violationMessage && (
            <div className="bg-red-600 text-white py-3 px-8 flex items-center justify-between z-40 sticky top-[73px]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest text-sm">Security Violation: {violationMessage}</span>
              </div>
              <button onClick={() => setViolationMessage(null)} className="text-white/60 hover:text-white font-bold text-xs uppercase">Dismiss</button>
            </div>
          )}

          <main className="max-w-4xl mx-auto p-10 animate-fade-in-up">
            {/* Overview strip */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Select a Subject</h2>
                <p className="text-sm text-gray-400 font-medium mt-1">Click any subject to start answering its questions</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Progress</p>
                <p className="text-2xl font-black text-gray-900">
                  <span className="text-emerald-500">{answeredCount}</span>
                  <span className="text-gray-300 text-lg"> / </span>
                  {totalCount}
                </p>
              </div>
            </div>

            {/* Subject cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {subjectList.map(subj => {
                const indices  = subjectMap[subj];
                const answered = indices.filter(i => !!responses[attempt.responses[i].question._id]).length;
                const pct      = Math.round((answered / indices.length) * 100);
                const done     = answered === indices.length;

                return (
                  <button
                    key={subj}
                    onClick={() => openSubject(subj)}
                    className="group text-left p-7 bg-white rounded-[2rem] border border-gray-100 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 group-hover:bg-orange-500 flex items-center justify-center transition-colors duration-300">
                        <BookOpen className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors duration-300" />
                      </div>
                      {done && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-1 group-hover:text-orange-500 transition-colors">{subj}</h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">
                      {indices.length} question{indices.length !== 1 ? 's' : ''}
                    </p>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-400' : 'bg-orange-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{answered} answered</span>
                        <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-orange-500 transition-colors">
                          Start <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit strip */}
            <div className="mt-10 p-6 bg-white rounded-3xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900">Ready to submit?</p>
                <p className="text-[11px] text-gray-400 font-medium">
                  {answeredCount < totalCount
                    ? `${totalCount - answeredCount} question${totalCount - answeredCount !== 1 ? 's' : ''} still unanswered`
                    : 'All questions answered'}
                </p>
              </div>
              <button
                onClick={() => submitTest()}
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] text-sm"
              >
                Submit Test
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Question view (subject selected) ────────────────────────────────
  if (!currentQuestionObj) return <div className="p-10 text-center">Loading question data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative">
      <ParticleBackground />
      <div className="relative z-10">

        <Header />

        {violationMessage && (
          <div className="bg-red-600 text-white py-3 px-8 animate-bounce flex items-center justify-between z-40 sticky top-[73px]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold uppercase tracking-widest text-sm">Security Violation: {violationMessage}</span>
            </div>
            <button onClick={() => setViolationMessage(null)} className="text-white/60 hover:text-white font-bold text-xs uppercase">Dismiss</button>
          </div>
        )}

        <main className="max-w-7xl mx-auto p-8 grid lg:grid-cols-[1fr_320px] gap-8">

          {/* ── QUESTION AREA ── */}
          <div className="animate-fade-in-up space-y-4">

            {/* Chapter banner at chapter boundary */}
            {isChapterStart && (
              <div className="flex items-center gap-4 px-6 py-4 bg-gray-900 rounded-2xl shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.15em] mb-0.5">Chapter</p>
                  <p className="text-sm font-black text-white tracking-tight">{currentChapter}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">In chapter</p>
                  <p className="text-sm font-black text-white">{chapterIndices.length} questions</p>
                </div>
              </div>
            )}

            <div className="card p-10 min-h-[500px] flex flex-col">
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="badge-orange">Q {posInSubject + 1} of {subjectTotal}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {posInChapter} of {chapterIndices.length} in chapter
                    </span>
                    {flagged.has(currentQuestionIndex) && (
                      <span className="text-[10px] font-black text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Flagged</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {currentQuestionObj.difficulty && (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        currentQuestionObj.difficulty === 'Easy'   ? 'bg-emerald-50 text-emerald-600' :
                        currentQuestionObj.difficulty === 'Hard'   ? 'bg-red-50 text-red-600'         :
                                                                     'bg-orange-50 text-orange-600'
                      }`}>{currentQuestionObj.difficulty}</span>
                    )}
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {getMarks(currentQuestionObj)} {getMarks(currentQuestionObj) === 1 ? 'mark' : 'marks'}
                    </span>
                    <button
                      onClick={() => toggleFlag(currentQuestionIndex)}
                      title="Mark for Review"
                      className={`p-2 rounded-xl transition-all ${flagged.has(currentQuestionIndex) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'}`}
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-6">{currentQuestionObj.text}</h2>

                {currentQuestionObj.image && (
                  <div className="mb-8 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 flex justify-center">
                    <img
                      src={currentQuestionObj.image.startsWith('data:') ? currentQuestionObj.image : `data:image/png;base64,${currentQuestionObj.image}`}
                      alt="Question diagram"
                      className="max-w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 flex-1">
                {(currentQuestionObj.type === 'MCQ' || currentQuestionObj.type === 'True/False' || !currentQuestionObj.type) &&
                  currentQuestionObj.options.map((option: any, i: number) => {
                    const isSelected = responses[currentQuestionObj._id] === option.text;
                    return (
                      <label
                        key={i}
                        className={`group block p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/50 shadow-md ring-4 ring-orange-500/5'
                            : 'border-gray-100 bg-gray-50/30 hover:border-orange-200 hover:bg-white'
                        }`}
                      >
                        <input type="radio" name="question" className="hidden" checked={isSelected}
                          onChange={() => saveResponse(currentQuestionObj._id, option.text)} />
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center mr-5 text-sm font-black transition-colors ${
                            isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-400 group-hover:border-orange-300'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span className={`text-base font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{option.text}</span>
                        </div>
                      </label>
                    );
                  })
                }

                {currentQuestionObj.type === 'Subjective' && (
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">Your Answer</label>
                    <textarea
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl p-6 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all font-medium min-h-[300px] shadow-sm"
                      placeholder="Type your detailed answer here..."
                      value={currentAnswer}
                      onChange={(e) => saveResponse(currentQuestionObj._id, e.target.value, true)}
                    />
                    <div className="flex items-center justify-between pl-1">
                      <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        {pendingSave
                          ? <><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Saving...</>
                          : <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Draft saved</>
                        }
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between">
                <button
                  disabled={posInSubject === 0}
                  onClick={goToPrev}
                  className="px-8 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {posInSubject === subjectTotal - 1 ? (
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Subjects
                  </button>
                ) : (
                  <button
                    onClick={goToNext}
                    className="bg-gray-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-black transition-all active:scale-[0.98]"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div className="space-y-6 animate-fade-in-up delay-100">
            <div className="card p-6">
              <CameraMonitor onViolation={(type) => {
                api.post(`/api/attempts/${attempt._id}/violation`, { type });
                setViolationMessage(type);
              }} />
            </div>

            {/* Navigator — chapters within this subject */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5 border-b border-gray-50 pb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Navigator</h3>
                <span className="text-xs font-bold text-gray-500">
                  <span className="text-emerald-600">
                    {visibleIndices.filter(i => !!responses[attempt.responses[i].question._id]).length}
                  </span>
                  <span className="text-gray-300"> / </span>
                  {subjectTotal} answered
                </span>
              </div>

              <div className="space-y-5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {chapterList.map(chapter => {
                  const indices  = chapterMap[chapter];
                  const answered = indices.filter(i => !!responses[attempt.responses[i].question._id]).length;
                  return (
                    <div key={chapter}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-gray-400 shrink-0" />
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate max-w-[150px]">{chapter}</p>
                        </div>
                        <span className="text-[8px] font-black text-gray-400 shrink-0">{answered}/{indices.length}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {indices.map((i: number) => {
                          const r          = attempt.responses[i];
                          const isCurrent  = currentQuestionIndex === i;
                          const isAnswered = !!responses[r.question._id];
                          const isFlagged  = flagged.has(i);
                          return (
                            <button
                              key={i}
                              onClick={() => setCurrentQuestionIndex(i)}
                              title={isFlagged ? 'Flagged for review' : undefined}
                              className={`relative w-full aspect-square rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                                isCurrent  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20'
                                : isAnswered ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                           : 'bg-gray-50 text-gray-400 border border-gray-100 hover:border-orange-200 hover:text-orange-500'
                              }`}
                            >
                              {posInSubject === visibleIndices.indexOf(i) + 0 ? i + 1 : i + 1}
                              {isFlagged && <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-50 space-y-2">
                {[
                  { color: 'bg-orange-500', label: 'Current' },
                  { color: 'bg-emerald-100 border border-emerald-200', label: 'Answered' },
                  { color: 'bg-gray-50 border border-gray-100', label: 'Not visited' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-3 text-xs font-bold text-gray-400">
                    <div className={`w-3 h-3 rounded-md ${color}`} /> {label}
                  </div>
                ))}
              </div>

              <button
                onClick={() => submitTest()}
                className="w-full mt-5 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
              >
                Submit Test
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-4 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Strict Proctoring</p>
                <p className="text-[11px] text-red-500/80 font-medium leading-relaxed">Switching tabs or minimizing will trigger an immediate alert to the proctor.</p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
