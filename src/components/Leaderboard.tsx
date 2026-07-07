import React, { useState, useEffect, useMemo } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { Attempt } from "../types";
import { motion } from "motion/react";
import { 
  Trophy, 
  Search, 
  Award, 
  Filter, 
  UserCheck, 
  RefreshCw
} from "lucide-react";

interface LeaderboardProps {
  exams: any[];
  activeExamId?: string;
}

export default function Leaderboard({ exams, activeExamId }: LeaderboardProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeExamId && activeExamId !== "all") {
      setSelectedExamId(activeExamId);
    }
  }, [activeExamId]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "attempts"),
        limit(500)
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
      console.error("Error fetching leaderboard attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  // Aggregate user attempts by username to calculate total exam participations
  const groupedUsers = useMemo(() => {
    const counts: Record<string, { username: string; count: number; initials: string; hasVerified: boolean }> = {};
    
    attempts.forEach((att) => {
      // Filter by exam first if specified
      if (selectedExamId !== "all" && att.examId !== selectedExamId) {
        return;
      }

      const userKey = att.username ? att.username.trim() : "";
      if (!userKey) return;

      if (!counts[userKey]) {
        counts[userKey] = {
          username: att.username,
          count: 0,
          initials: att.username.slice(0, 2).toUpperCase(),
          hasVerified: !!att.userId
        };
      }
      counts[userKey].count += 1;
    });

    // Convert to array, filter by search term, and sort descending
    return Object.values(counts)
      .filter((user) => user.username.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [attempts, selectedExamId, searchTerm]);

  return (
    <div className="bg-slate-900 rounded-2xl text-white shadow-lg overflow-hidden border border-slate-800 flex flex-col font-sans">
      {/* Title section */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/15 rounded-xl border border-indigo-500/20">
            <Trophy className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">অংশগ্রহণভিত্তিক মেধা তালিকা (Participation Leaderboard)</h2>
            <p className="text-xs text-slate-400 mt-0.5">সবচেয়ে বেশি পরীক্ষায় অংশ নেওয়া প্রতিযোগীদের তালিকা</p>
          </div>
        </div>

        <button 
          onClick={fetchAttempts}
          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="রিফ্রেশ করুন"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="প্রতিযোগীর নাম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Filter select */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-800 text-slate-100 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[160px]"
          >
            <option value="all">সব পরীক্ষা (All Exams)</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaderboard content */}
      <div className="p-6 overflow-y-auto max-h-[500px] space-y-3">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">রেকর্ড লোড হচ্ছে...</p>
          </div>
        ) : groupedUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Award className="w-10 h-10 text-slate-500 mx-auto animate-pulse" />
            <p className="text-sm text-slate-400 font-medium">কোনো তথ্য পাওয়া যায়নি।</p>
            <p className="text-xs text-slate-500">প্রথম প্রতিযোগী হিসেবে পরীক্ষায় অংশ নিয়ে লিডারবোর্ডের শীর্ষে চলে আসুন!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {groupedUsers.map((user, index) => {
              // Dynamic avatar background colors
              const bgColors = ["bg-indigo-600", "bg-emerald-600", "bg-orange-600", "bg-sky-600", "bg-purple-600"];
              const avatarBg = bgColors[index % bgColors.length];

              return (
                <motion.div
                  key={user.username}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  className="flex items-center justify-between bg-white/[0.03] p-4 rounded-xl border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Rank */}
                    <span className={`font-black text-sm w-5 text-center ${
                      index === 0 ? "text-yellow-400 text-lg" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-600" : "text-slate-400"
                    }`}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                    </span>

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-xs font-black text-white uppercase shrink-0 shadow-sm`}>
                      {user.initials || "?"}
                    </div>

                    {/* Candidate information */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-100">{user.username}</span>
                        {user.hasVerified && (
                          <span className="p-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px]" title="Verified Registered Account">
                            <UserCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">অংশগ্রহণকারী (Competitor)</p>
                    </div>
                  </div>

                  {/* Participation Count only (Zero personal logs or email/score) */}
                  <div className="text-right">
                    <p className="text-sm font-black text-indigo-400">
                      {user.count} <span className="text-xs text-slate-300 font-bold">টি পরীক্ষা</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                      {user.count} {user.count === 1 ? "Attempt" : "Attempts"} completed
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
