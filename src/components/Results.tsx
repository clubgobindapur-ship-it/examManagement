import React, { useState, useEffect, useMemo } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Exam, Attempt } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Search, 
  Trophy, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ChevronRight, 
  BookOpen, 
  AlertCircle,
  TrendingUp,
  Inbox
} from "lucide-react";

interface ResultsProps {
  exams: Exam[];
}

export default function Results({ exams }: ResultsProps) {
  // Only display exams where results are published (showResult is true)
  const publishedExams = useMemo(() => {
    return exams.filter((exam) => exam.showResult === true);
  }, [exams]);

  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedExam = useMemo(() => {
    return publishedExams.find((e) => e.id === selectedExamId) || null;
  }, [publishedExams, selectedExamId]);

  // Set default selected exam to the first published exam if available
  useEffect(() => {
    if (publishedExams.length > 0 && !selectedExamId) {
      setSelectedExamId(publishedExams[0].id);
    }
  }, [publishedExams, selectedExamId]);

  // Fetch attempts for selected exam
  const fetchAttemptsForExam = async (examId: string) => {
    if (!examId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "attempts"),
        where("examId", "==", examId)
      );
      let snap;
      try {
        snap = await getDocs(q);
      } catch (getErr) {
        handleFirestoreError(getErr, OperationType.LIST, "attempts");
      }
      const list: Attempt[] = [];
      if (snap) {
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Attempt);
        });
      }
      setAttempts(list);
    } catch (err) {
      console.error("Error fetching exam results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchAttemptsForExam(selectedExamId);
    } else {
      setAttempts([]);
    }
  }, [selectedExamId]);

  // Calculate sorted attempts, ranking, and pass/fail statuses
  const processedResults = useMemo(() => {
    if (!selectedExam) return [];

    // Sort attempts:
    // 1. Total Obtained Mark / Score (descending)
    // 2. Time Taken (ascending)
    // 3. Completed At (ascending)
    const sorted = [...attempts].sort((a, b) => {
      const aMark = a.totalObtainedMark !== undefined ? a.totalObtainedMark : (a.score || 0);
      const bMark = b.totalObtainedMark !== undefined ? b.totalObtainedMark : (b.score || 0);
      if (bMark !== aMark) {
        return bMark - aMark;
      }
      if (a.timeTaken !== b.timeTaken) {
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      }
      return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
    });

    const passPercentage = selectedExam.passPercentage || 40;
    const minPassMark = selectedExam.minPassMark || 0;
    const totalCount = sorted.length;
    const passLimit = Math.max(1, Math.round((totalCount * passPercentage) / 100));

    return sorted.map((att, index) => {
      const rank = index + 1;
      const obtainedMark = att.totalObtainedMark !== undefined ? att.totalObtainedMark : (att.score || 0);
      const isPass = totalCount > 0 ? (rank <= passLimit && obtainedMark >= minPassMark) : false;
      return {
        ...att,
        rank,
        isPass,
        obtainedMark,
        totalExamMark: att.examTotalMark !== undefined ? att.examTotalMark : ((att.totalQuestions || 10) * (selectedExam.markPerQuestion || 1))
      };
    });
  }, [attempts, selectedExam]);

  // Filter by search term (username search)
  const filteredResults = useMemo(() => {
    return processedResults.filter((r) => {
      const name = r.username ? r.username.toLowerCase() : "";
      const search = searchTerm.toLowerCase();
      return name.includes(search);
    });
  }, [processedResults, searchTerm]);

  // Format helper for mask emails to protect privacy
  const maskEmail = (emailStr?: string) => {
    if (!emailStr) return "পরীক্ষার্থী (Guest)";
    const parts = emailStr.split("@");
    if (parts.length !== 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  };

  return (
    <div className="space-y-6 font-sans transition-colors">
      {/* Title Header banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/5 rounded-full blur-xl" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Trophy className="w-6 h-6 text-yellow-400 fill-yellow-400/20" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">পরীক্ষার ফলাফল ও মেধা তালিকা (Results & Merit List)</h2>
            <p className="text-xs text-indigo-100 font-medium">অ্যাডমিন প্যানেল থেকে প্রকাশিত পরীক্ষার অফিসিয়াল ফলাফল ও মেধা তালিকা।</p>
          </div>
        </div>
      </div>

      {publishedExams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
          <Inbox className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">কোনো ফলাফল প্রকাশিত হয়নি</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              এই মুহূর্তে কোনো পরীক্ষার ফলাফল প্রকাশিত হয়নি। অ্যাডমিন প্যানেল থেকে কোনো পরীক্ষার ফলাফল প্রকাশ করা হলে আপনি এই ট্যাবে বিস্তারিত ফলাফল দেখতে পারবেন।
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: List of published exams */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">প্রকাশিত পরীক্ষা সমূহ ({publishedExams.length})</h3>
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {publishedExams.map((exam) => {
                  const isActive = exam.id === selectedExamId;
                  return (
                    <button
                      key={exam.id}
                      onClick={() => setSelectedExamId(exam.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                        isActive
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <p className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-slate-800 dark:text-slate-200"}`}>
                          {exam.name}
                        </p>
                        <div className="flex items-center gap-2 text-[12px] opacity-75 font-mono">
                          <span>{exam.timeLimit} মিনিট</span>
                          <span>•</span>
                          <span>পাস হার: {exam.passPercentage || 40}%</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-white translate-x-0.5" : "text-slate-400 group-hover:translate-x-0.5"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Main Panel: Result merit list details */}
          <div className="lg:col-span-8 space-y-4">
            {selectedExam && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                {/* Exam Merit Info Header */}
                <div className="p-6 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        ফলাফল শিট (Official Results)
                      </span>
                      <span className="text-[12px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                        শীর্ষ {selectedExam.passPercentage || 40}% পাস
                      </span>
                      {selectedExam.minPassMark !== undefined && selectedExam.minPassMark > 0 && (
                        <span className="text-[12px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md">
                          ন্যূনতম পাস নম্বর: {selectedExam.minPassMark}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-indigo-950 dark:text-white mt-1">{selectedExam.name}</h3>
                  </div>

                  <button
                    onClick={() => fetchAttemptsForExam(selectedExam.id)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="রিফ্রেশ ফলাফল"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Search & Statistics summary */}
                <div className="p-6 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="পরীক্ষার্থীর নাম দিয়ে খুঁজুন..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-750 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  {attempts.length > 0 && (
                    <div className="flex gap-4 shrink-0 text-xs font-bold text-slate-500">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl text-center">
                        <span className="text-slate-400 block text-[11px] uppercase">মোট পরীক্ষার্থী</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-sm">{attempts.length} জন</span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 rounded-xl text-center">
                        <span className="text-emerald-500/80 block text-[11px] uppercase">মোট উত্তীর্ণ</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                          {processedResults.filter(r => r.isPass).length} জন
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Table */}
                <div className="flex-1 overflow-y-auto max-h-[450px]">
                  {loading ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs text-slate-400 font-semibold">ফলাফল ও মেধা তালিকা লোড হচ্ছে...</p>
                    </div>
                  ) : filteredResults.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-400 font-semibold">কোনো ফলাফল রেকর্ড পাওয়া যায়নি।</p>
                      <p className="text-[12px] text-slate-500">পরীক্ষায় অংশ নিয়ে ফলাফলের তালিকায় যুক্ত হোন!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-150 dark:border-slate-800">
                            <th className="py-3 px-4 text-center w-12 font-bold">মেধা</th>
                            <th className="py-3 px-4 font-bold">পরীক্ষার্থী (Candidate)</th>
                            <th className="py-3 px-4 text-center font-bold">প্রাপ্ত নম্বর</th>
                            <th className="py-3 px-4 text-center font-bold">পরিসংখ্যান</th>
                            <th className="py-3 px-4 text-center font-bold">সময়</th>
                            <th className="py-3 px-4 text-center font-bold">ফলাফল</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredResults.map((result, idx) => {
                            const bgColors = ["bg-blue-600", "bg-emerald-600", "bg-orange-600", "bg-sky-600", "bg-purple-600"];
                            const initials = result.username ? result.username.slice(0, 2).toUpperCase() : "?";
                            const avatarBg = bgColors[idx % bgColors.length];

                            return (
                              <motion.tr
                                key={result.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(idx * 0.01, 0.25) }}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                {/* Rank/Merit */}
                                <td className="py-4 px-4 text-center">
                                  <span className={`font-black text-xs ${
                                    result.rank === 1 ? "text-yellow-500 text-sm" : result.rank === 2 ? "text-slate-400" : result.rank === 3 ? "text-amber-600" : "text-slate-500"
                                  }`}>
                                    {result.rank === 1 ? "🥇" : result.rank === 2 ? "🥈" : result.rank === 3 ? "🥉" : result.rank}
                                  </span>
                                </td>

                                {/* Name & Masked email */}
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-[12px] font-black text-white uppercase shrink-0`}>
                                      {initials}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{result.username}</p>
                                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">{maskEmail(result.email)}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Score / Marks */}
                                <td className="py-4 px-4 text-center font-mono font-extrabold text-slate-800 dark:text-slate-200">
                                  <span className="text-indigo-600 dark:text-indigo-400 text-sm">{result.obtainedMark}</span>
                                  <span className="text-slate-400 font-bold text-[12px]"> / {result.totalExamMark}</span>
                                </td>

                                {/* Stats */}
                                <td className="py-4 px-4 text-center">
                                  <div className="inline-flex gap-1.5 text-[12px] font-mono">
                                    <span className="text-emerald-600 font-extrabold" title="Correct Answers">✓{result.correctCount || 0}</span>
                                    <span className="text-rose-500 font-extrabold" title="Wrong Answers">✗{result.wrongCount || 0}</span>
                                    {result.skippedCount !== undefined && (
                                      <span className="text-slate-400 font-bold" title="Skipped">○{result.skippedCount}</span>
                                    )}
                                  </div>
                                </td>

                                {/* Time taken */}
                                <td className="py-4 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                                  {Math.floor((result.timeTaken || 0) / 60)}মি. {(result.timeTaken || 0) % 60}সে.
                                </td>

                                {/* Pass/Fail badge */}
                                <td className="py-4 px-4 text-center">
                                  {result.isPass ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-black rounded-lg text-[11px] uppercase tracking-wider">
                                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                                      <span>পাস</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-black rounded-lg text-[11px] uppercase tracking-wider">
                                      <XCircle className="w-3 h-3 text-rose-500" />
                                      <span>ফেল</span>
                                    </span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
