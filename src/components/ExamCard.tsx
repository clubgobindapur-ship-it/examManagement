import React, { useState } from "react";
import { Exam, formatExamDate } from "../types";
import { motion } from "motion/react";
import { 
  Clock, 
  ChevronRight, 
  Lock, 
  Unlock,
  Sparkles, 
  User, 
  ArrowRight,
  ShieldAlert,
  Check,
  Calendar,
  DollarSign,
  HelpCircle,
  Award,
  RefreshCw
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
  onUnlock
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

  return (
    <motion.div
      whileHover={isLive ? { y: -4 } : {}}
      className={`bg-white dark:bg-slate-900 border transition-all overflow-hidden flex flex-col justify-between h-full font-sans rounded-2xl ${
        isLive 
          ? "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md shadow-sm" 
          : "border-slate-200/50 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-950/20 opacity-75"
      }`}
    >
      <div className="p-6 space-y-4">
        {/* Sl no and Status Tag */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono tracking-wider text-blue-650 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
            SL {exam.slNo.toString().padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Free/Paid badge */}
            {!isFree ? (
              <span className="text-[11px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border border-amber-100 dark:border-amber-900/30 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>{exam.price} ৳</span>
              </span>
            ) : (
              <span className="text-[11px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30">
                FREE
              </span>
            )}
            <span className={`text-[11px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${
              isLive 
                ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" 
                : isArchived
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                : "bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400"
            }`}>
              {isLive ? "চলতি পরীক্ষা" : isArchived ? "আর্কাইভ" : "বন্ধ"}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">{exam.name}</h3>
        </div>

        {/* Time Limit & Exam Date */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350 font-medium">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">সময়সীমা: {exam.timeLimit} মিনিট</span>
          </div>

          {exam.examDate && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350 font-medium">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold">পরীক্ষার তারিখ: {formatExamDate(exam.examDate)}</span>
            </div>
          )}

          {exam.questionCount !== undefined && exam.questionCount > 0 && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350 font-medium">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold">প্রশ্নের সংখ্যা: {exam.questionCount}টি</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
            <span className="text-[12px] uppercase font-extrabold text-slate-400 tracking-wider">নম্বর বিভাজন (Marking Scheme)</span>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-slate-600 dark:text-slate-405 font-bold font-mono">
              <div className="bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded border border-slate-100/80 dark:border-slate-800/60">
                সঠিক: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">+{exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded border border-slate-100/80 dark:border-slate-800/60">
                ভুল: <span className="text-rose-600 dark:text-rose-450 font-extrabold">-{exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button/Gate footer */}
      <div className="p-6 pt-0 border-t-0 bg-slate-50/10">
        {!isLive ? (
          <div className="flex items-center justify-between text-slate-400 py-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{isArchived ? "আর্কাইভ করা হয়েছে" : "শেষ হয়েছে"}</span>
            </span>
          </div>
        ) : isAttempted ? (
          <div className="space-y-2.5">
            <div className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 font-bold rounded-xl flex items-center justify-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>ইতিমধ্যে সম্পন্ন করেছেন</span>
            </div>
            <div className="flex flex-col gap-2">
              {exam.showResult && (
                <button
                  onClick={() => {
                    const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "পরীক্ষার্থী";
                    onStartExam(exam, name, "view_result");
                  }}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800/60 transition-all cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-blue-500" />
                  <span>ফলাফল দেখুন</span>
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "পরীক্ষার্থী";
                    onStartExam(exam, name, "view_questions");
                  }}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>প্রশ্ন দেখুন</span>
                </button>
                <button
                  onClick={() => {
                    const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "পরীক্ষার্থী";
                    onStartExam(exam, name, "retake");
                  }}
                  className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>পুনরায় পরীক্ষা</span>
                </button>
              </div>
            </div>
          </div>
        ) : isLocked ? (
          <button
            id={`btn-unlock-${exam.id}`}
            onClick={() => onUnlock?.(exam)}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>আনলক করুন - {exam.price} ৳</span>
          </button>
        ) : !showGate ? (
          <button
            id={`btn-start-${exam.id}`}
            onClick={() => {
              if (currentUser) {
                // If logged in, begin immediately
                onStartExam(exam, currentUser.displayName || currentUser.email.split("@")[0]);
              } else {
                setShowGate(true);
              }
            }}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer"
          >
            <span>{currentUser ? "পরীক্ষা শুরু করুন" : "পরীক্ষায় অংশ নিন"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <form onSubmit={handleBegin} className="pt-4 space-y-3.5 border-t border-slate-100/60 dark:border-slate-800/60" id={`form-gate-${exam.id}`}>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider block">
                আপনার নাম লিখুন
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id={`input-nick-${exam.id}`}
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="যেমন: সাকিব হাসান"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-[13px] font-medium text-rose-600 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowGate(false);
                  setError("");
                }}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                id={`btn-begin-${exam.id}`}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <span>শুরু করুন</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
