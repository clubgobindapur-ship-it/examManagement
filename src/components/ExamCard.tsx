import React, { useState } from "react";
import { Exam, formatExamDate } from "../types";
import { motion } from "motion/react";
import { 
  Clock, 
  ChevronRight, 
  Lock, 
  Sparkles, 
  User, 
  ArrowRight,
  ShieldAlert,
  Check,
  Calendar
} from "lucide-react";

interface ExamCardProps {
  key?: string;
  exam: Exam;
  currentUser: any;
  onStartExam: (exam: Exam, username: string) => void;
  isAttempted?: boolean;
}

export default function ExamCard({ exam, currentUser, onStartExam, isAttempted = false }: ExamCardProps) {
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

  return (
    <motion.div
      whileHover={isLive ? { y: -4 } : {}}
      className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between h-full font-sans ${
        isLive 
          ? "border-slate-200/80 hover:border-blue-300 hover:shadow-md shadow-sm" 
          : "border-slate-200/50 bg-slate-50/40 opacity-75"
      }`}
    >
      <div className="p-6 space-y-4">
        {/* Sl no and Status Tag */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            SL {exam.slNo.toString().padStart(2, "0")}
          </span>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
            isLive 
              ? "bg-green-100 text-green-700" 
              : isArchived
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}>
            {isLive ? "চলতি পরীক্ষা (LIVE)" : isArchived ? "আর্কাইভ (ARCHIVE)" : "বন্ধ (CLOSED)"}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 line-clamp-2 leading-snug">{exam.name}</h3>
        </div>

        {/* Time Limit & Exam Date */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">সময়সীমা: {exam.timeLimit} মিনিট</span>
          </div>

          {exam.examDate && (
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold">পরীক্ষার তারিখ: {formatExamDate(exam.examDate)}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 mt-2">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">নম্বর বিভাজন (Marking Scheme)</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-semibold">
              <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100/80">
                সঠিক উত্তর: <span className="text-indigo-600">+{exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1}</span>
              </div>
              <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100/80">
                ভুল পেনাল্টি: <span className="text-rose-600">-{exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Button/Gate footer */}
      <div className="p-6 pt-0 border-t border-slate-150 bg-slate-50/10">
        {!isLive ? (
          <div className="flex items-center justify-between text-slate-400 py-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{isArchived ? "আর্কাইভ করা হয়েছে" : "শেষ হয়েছে"}</span>
            </span>
          </div>
        ) : isAttempted ? (
          <div className="w-full py-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 text-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>ইতিমধ্যে সম্পন্ন করেছেন</span>
          </div>
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
          <form onSubmit={handleBegin} className="pt-4 space-y-3.5 border-t border-slate-100/60" id={`form-gate-${exam.id}`}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
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
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg text-xs transition-colors cursor-pointer"
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
