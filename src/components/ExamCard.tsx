import React, { useState } from "react";
import { Exam, formatExamDate } from "../types";
import { motion } from "motion/react";
import {
  Clock,
  ChevronRight,
  Lock,
  User,
  ArrowRight,
  ShieldAlert,
  Check,
  Calendar,
  HelpCircle,
  Award,
  RefreshCw,
} from "lucide-react";

interface ExamCardProps {
  key?: string | number;
  exam: Exam;
  currentUser: any;
  onStartExam: (exam: Exam, username: string, mode?: "take" | "retake" | "view_questions" | "view_result") => void;
  isAttempted?: boolean;
  isLocked?: boolean;
  onUnlock?: (exam: Exam) => void;
}

export default function ExamCard({
  exam,
  currentUser,
  onStartExam,
  isAttempted = false,
  isLocked = false,
  onUnlock,
}: ExamCardProps) {
  const [showGate, setShowGate] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleBegin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (currentUser) {
      onStartExam(exam, currentUser.displayName || currentUser.email.split("@")[0]);
      return;
    }

    if (!username.trim()) {
      setError("আপনার স্কোর সংরক্ষণ করতে পরীক্ষার্থীর নাম আবশ্যক।");
      return;
    }

    if (username.trim().length < 2) {
      setError("নাম অন্তত ২ অক্ষরের হতে হবে।");
      return;
    }

    onStartExam(exam, username.trim());
  };

  const isLive = exam.status === "live";
  const isArchived = exam.status === "archived" || exam.status === "archive";
  const isFree = exam.isFree !== false;

  const accentGradient = isLive
    ? "from-blue-500 via-blue-500 to-indigo-500"
    : isArchived
    ? "from-amber-400 to-orange-400"
    : "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700";

  return (
    <motion.div
      whileHover={isLive ? { y: -3 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col h-full font-sans transition-all duration-200 ${
        isLive
          ? "border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-500/8 dark:hover:shadow-blue-500/10 hover:border-blue-200/80 dark:hover:border-blue-800/60"
          : "border border-slate-200/60 dark:border-slate-800/40 opacity-65"
      }`}
    >
      {/* Top color accent strip */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${accentGradient} shrink-0`} />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* ── Row 1: SL number + status badges ── */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-500">
            #{exam.slNo.toString().padStart(2, "0")}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Free / Paid badge */}
            {!isFree ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-700/40">
                <Lock className="w-2.5 h-2.5" />
                {exam.price}৳
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-700/40">
                Free
              </span>
            )}

            {/* Status badge */}
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200/70 dark:border-green-700/40">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Live
              </span>
            ) : isArchived ? (
              <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-700/40">
                Archive
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/40">
                Closed
              </span>
            )}
          </div>
        </div>

        {/* ── Row 2: Exam title ── */}
        <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 -mt-1">
          {exam.name}
        </h3>

        {/* ── Row 3: Meta chips ── */}
        <div className="flex flex-wrap gap-1.5">
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700/60">
            <Clock className="w-3 h-3 text-blue-500 shrink-0" />
            {exam.timeLimit} মিনিট
          </div>

          {exam.questionCount !== undefined && exam.questionCount > 0 && (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <HelpCircle className="w-3 h-3 text-indigo-500 shrink-0" />
              {exam.questionCount} প্রশ্ন
            </div>
          )}

          {exam.examDate && (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
              {formatExamDate(exam.examDate)}
            </div>
          )}
        </div>

        {/* ── Row 4: Marking scheme ── */}
        <div className="flex items-center gap-3 py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold shrink-0">নম্বর</span>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
            +{exam.markPerQuestion ?? 1} সঠিক
          </span>
          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <span className="text-[12px] font-bold text-rose-500 dark:text-rose-400">
            −{exam.penaltyMark ?? 0.25} ভুল
          </span>
        </div>

        {/* Push CTA to bottom */}
        <div className="flex-1" />

        {/* ── CTA area ── */}
        {!isLive ? (
          /* Archived / Closed state */
          <div className="flex items-center justify-center gap-1.5 py-3 text-slate-400 dark:text-slate-500 text-[12px] font-semibold select-none">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{isArchived ? "আর্কাইভ করা হয়েছে" : "পরীক্ষা শেষ হয়েছে"}</span>
          </div>

        ) : isAttempted ? (
          /* Already attempted */
          <div className="space-y-2">
            <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-1.5 text-[12px]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              সম্পন্ন হয়েছে
            </div>

            {exam.showResult && (
              <button
                onClick={() => {
                  const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "পরীক্ষার্থী";
                  onStartExam(exam, name, "view_result");
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[12px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                ফলাফল দেখুন
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "পরীক্ষার্থী";
                  onStartExam(exam, name, "view_questions");
                }}
                className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-[12px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
              >
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                প্রশ্ন
              </button>
              <button
                onClick={() => {
                  const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "পরীক্ষার্থী";
                  onStartExam(exam, name, "retake");
                }}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                পুনরায়
              </button>
            </div>
          </div>

        ) : isLocked ? (
          /* Locked — needs purchase */
          <button
            id={`btn-unlock-${exam.id}`}
            onClick={() => onUnlock?.(exam)}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-[12px] shadow-sm cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            আনলক করুন — {exam.price}৳
          </button>

        ) : !showGate ? (
          /* Primary start CTA */
          <button
            id={`btn-start-${exam.id}`}
            onClick={() => {
              if (currentUser) {
                onStartExam(exam, currentUser.displayName || currentUser.email.split("@")[0]);
              } else {
                setShowGate(true);
              }
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] shadow-sm cursor-pointer group"
          >
            <span>{currentUser ? "পরীক্ষা শুরু করুন" : "পরীক্ষায় অংশ নিন"}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
          </button>

        ) : (
          /* Guest name gate form */
          <form
            onSubmit={handleBegin}
            className="space-y-3"
            id={`form-gate-${exam.id}`}
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                আপনার নাম লিখুন
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  id={`input-nick-${exam.id}`}
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="যেমন: সাকিব হাসান"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowGate(false); setError(""); }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[12px] transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                id={`btn-begin-${exam.id}`}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[12px] flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                শুরু
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
