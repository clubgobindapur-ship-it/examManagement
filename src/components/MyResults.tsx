import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "motion/react";
import { Award, Loader2, Sparkles, LogIn, Trophy, Clock, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import { Exam } from "../types";

interface MyResultsProps {
  currentUser: any;
  onOpenAuth: () => void;
  exams: Exam[];
}

export default function MyResults({ currentUser, onOpenAuth, exams }: MyResultsProps) {
  const [personalResults, setPersonalResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || exams.length === 0) return;

    const fetchPersonalResults = async () => {
      setLoading(true);
      try {
        // Find all published exams
        const publishedExams = exams.filter(e => e.showResult === true);
        if (publishedExams.length === 0) {
          setPersonalResults([]);
          setLoading(false);
          return;
        }

        // Fetch user attempts
        const userAttemptsQ = query(
          collection(db, "attempts"),
          where("userId", "==", currentUser.uid)
        );
        const userAttemptsSnap = await getDocs(userAttemptsQ);
        const userAttemptsList: any[] = [];
        userAttemptsSnap.forEach(d => {
          userAttemptsList.push({ id: d.id, ...d.data() });
        });

        const resultsList: any[] = [];

        for (const exam of publishedExams) {
          // Check if current user attempted this exam
          const userAttempt = userAttemptsList.find(att => att.examId === exam.id);
          if (!userAttempt) continue; // Skip if user didn't take this exam

          // Query all attempts for this exam to calculate the rank & pass/fail
          const q = query(collection(db, "attempts"), where("examId", "==", exam.id));
          const snap = await getDocs(q);
          const allAttempts: any[] = [];
          snap.forEach(docSnap => {
            allAttempts.push({ id: docSnap.id, ...docSnap.data() });
          });

          // Sort all attempts to find correct rank
          const sorted = [...allAttempts].sort((a, b) => {
            const aMark = a.totalObtainedMark !== undefined ? a.totalObtainedMark : (a.score || 0);
            const bMark = b.totalObtainedMark !== undefined ? b.totalObtainedMark : (b.score || 0);
            if (bMark !== aMark) return bMark - aMark;
            if ((a.timeTaken || 0) !== (b.timeTaken || 0)) {
              return (a.timeTaken || 0) - (b.timeTaken || 0);
            }
            return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
          });

          const userIndex = sorted.findIndex(att => att.id === userAttempt.id);
          const rank = userIndex !== -1 ? userIndex + 1 : sorted.length;

          const passPercentage = exam.passPercentage || 40;
          const minPassMark = exam.minPassMark || 0;
          const totalCount = sorted.length;
          const passLimit = Math.max(1, Math.round((totalCount * passPercentage) / 100));

          const obtainedMark = userAttempt.totalObtainedMark !== undefined ? userAttempt.totalObtainedMark : (userAttempt.score || 0);
          const isPass = totalCount > 0 ? (rank <= passLimit && obtainedMark >= minPassMark) : false;

          resultsList.push({
            examName: exam.name,
            examId: exam.id,
            obtainedMark,
            totalExamMark: userAttempt.examTotalMark !== undefined ? userAttempt.examTotalMark : ((userAttempt.totalQuestions || 10) * (exam.markPerQuestion || 1)),
            rank,
            totalParticipants: totalCount,
            correctCount: userAttempt.correctCount || 0,
            wrongCount: userAttempt.wrongCount || 0,
            skippedCount: userAttempt.skippedCount || 0,
            completedAt: userAttempt.completedAt || new Date().toISOString(),
            isPass
          });
        }

        setPersonalResults(resultsList);
      } catch (err) {
        console.error("Error loading personal results:");
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalResults();
  }, [currentUser, exams]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Award className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">আমার ফলাফল শিট (My Exam Results)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            আপনার দেওয়া সকল পরীক্ষার বিস্তারিত ফলাফল ও মেধা তালিকা দেখতে দয়া করে আপনার অ্যাকাউন্টে লগইন করুন।
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
        >
          <LogIn className="w-4 h-4" />
          <span>লগইন করুন</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/5 rounded-full blur-xl" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">আমার ফলাফল শিট (My Results)</h2>
            <p className="text-xs text-emerald-100 mt-1">আপনার অংশ নেওয়া কুইজ ও পরীক্ষাসমূহের ব্যক্তিগত পারফরম্যান্স ড্যাশবোর্ড।</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">ফলাফল ও র্যাংক হিসাব করা হচ্ছে, দয়া করে অপেক্ষা করুন...</p>
        </div>
      ) : personalResults.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {personalResults.map((res, index) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={res.examId}
              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">পরীক্ষার নাম</span>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">{res.examName}</h3>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-black uppercase shrink-0 ${
                  res.isPass 
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35" 
                    : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35"
                }`}>
                  {res.isPass ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>উত্তীর্ণ (Pass)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>অনুত্তীর্ণ (Fail)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-[12px] text-slate-400 dark:text-slate-500 font-bold">প্রাপ্ত নম্বর</span>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                    <span className="text-lg text-emerald-600 dark:text-emerald-400">{res.obtainedMark}</span> / {res.totalExamMark}
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-[12px] text-slate-400 dark:text-slate-500 font-bold">মেধা স্থান (Rank)</span>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                    <span className="text-lg text-indigo-600 dark:text-indigo-400">#{res.rank}</span> / {res.totalParticipants} জন
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center text-[12px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-850 font-bold gap-2">
                <div className="flex gap-2">
                  <span className="text-emerald-600">সঠিক: {res.correctCount}</span>
                  <span className="text-rose-600">ভুল: {res.wrongCount}</span>
                  <span className="text-slate-500">বাদ: {res.skippedCount}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(res.completedAt).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" })}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-4">
          <Award className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">কোনো ফলাফল নেই</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              আপনি এখনো কোনো লাইভ অথবা রুটিনভিত্তিক পরীক্ষা শেষ করেননি অথবা সেগুলোর ফলাফল এখনো প্রকাশিত হয়নি। পরীক্ষা দিন এবং ফলাফল প্রকাশের পর মেধা স্থান দেখুন।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
