import React, { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, getDoc, setDoc, doc, query, where } from "firebase/firestore";
import { Exam, Attempt } from "./types";
import { DEFAULT_EXAMS } from "./data";

// Components
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import ExamCard from "./components/ExamCard";
import ActiveExam from "./components/ActiveExam";
import Leaderboard from "./components/Leaderboard";
import UserPerformanceChart from "./components/UserPerformanceChart";
import AdCarousel from "./components/AdCarousel";
import AdminLogin from "./components/AdminLogin";
import AdminSettings from "./components/AdminSettings";

// Analytics
import { trackEvent } from "./lib/analytics";

// Icons
import { 
  Sparkles, 
  HelpCircle, 
  Database, 
  AlertCircle, 
  BookOpen, 
  Plus, 
  Layers, 
  Award,
  RefreshCw,
  Calendar,
  Archive,
  Clock,
  Facebook,
  Youtube,
  Twitter,
  Globe,
  Instagram
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Robust helper to parse dates in mm/dd/yy or mm/dd/yyyy format for sorting
const parseExamDate = (dateStr?: string): number => {
  if (!dateStr) return Infinity; // No date means scheduled last
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    let month = parseInt(parts[0], 10);
    let day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year += 2000; // Assume 21st century for 2-digit years
    }
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? Infinity : parsed;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<"home" | "live" | "routine" | "archive" | "leaderboard" | "active_exam" | "admin">(() => {
    try {
      if (typeof window !== "undefined" && window.location.pathname === "/admin") {
        return "admin";
      }
    } catch (e) {}
    return "home";
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  // App settings & Exams state
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState("https://script.google.com/macros/s/AKfycbyXX86SurWUbz4CXQFWdyqud8zxXKsJZ5ihu9Cr4kzhxip5a-teiHb17HpCKFTPX3v3/exec");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  
  // Tab-switching state for live, routine, and archive exams
  const [activeExamTab, setActiveExamTab] = useState<"live" | "routine" | "archive">("live");
  
  // Attempted exams tracking (to allow only 1 attempt per exam)
  const [attemptedExamIds, setAttemptedExamIds] = useState<string[]>([]);
  const [userAttempts, setUserAttempts] = useState<Attempt[]>([]);
  
  // Active Exam state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeCandidateName, setActiveCandidateName] = useState("");

  // Helper to load attempted exam IDs for current user or guest
  const fetchUserAttempts = async (user: User | null) => {
    const localAttempted = new Set<string>();
    const fetchedAttemptsList: Attempt[] = [];
    
    // 1. Read from localStorage (robust for guest sessions)
    try {
      const localAttemptsStr = localStorage.getItem("localAttemptedExams") || "[]";
      const parsed = JSON.parse(localAttemptsStr);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => localAttempted.add(id));
      }
    } catch (e) {
      console.error("Error reading local attempts:", e);
    }

    // 2. Read from Firestore attempts collection if authenticated
    if (user) {
      try {
        const q = query(collection(db, "attempts"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Attempt;
          if (data.examId) {
            localAttempted.add(data.examId);
            fetchedAttemptsList.push(data);
          }
        });
      } catch (err) {
        console.error("Error fetching user attempts from Firestore:", err);
      }
    }

    // Sort chronologically by completion date
    fetchedAttemptsList.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    setAttemptedExamIds(Array.from(localAttempted));
    setUserAttempts(fetchedAttemptsList);
  };

  // 1. Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        try {
          localStorage.removeItem("localAttemptedExams");
        } catch (e) {
          console.error("Error clearing local attempts:", e);
        }
        setAttemptedExamIds([]);
        setUserAttempts([]);
      } else {
        fetchUserAttempts(user);
      }
    });
    return unsubscribe;
  }, []);

  // 2. Load Google Apps Script URL settings
  const loadSettings = async (): Promise<string> => {
    const defaultUrl = "https://script.google.com/macros/s/AKfycbyXX86SurWUbz4CXQFWdyqud8zxXKsJZ5ihu9Cr4kzhxip5a-teiHb17HpCKFTPX3v3/exec";
    try {
      const savedUrl = localStorage.getItem("googleAppsScriptUrl");
      const url = savedUrl || defaultUrl;
      setGoogleAppsScriptUrl(url);
      return url;
    } catch (err) {
      console.error("Error loading Apps Script URL:", err);
      setGoogleAppsScriptUrl(defaultUrl);
      return defaultUrl;
    }
  };

  // 3. Load or seed exams list
  const loadExams = async (currentUrl?: string) => {
    setLoadingExams(true);
    try {
      const scriptUrl = currentUrl || googleAppsScriptUrl || "https://script.google.com/macros/s/AKfycbyXX86SurWUbz4CXQFWdyqud8zxXKsJZ5ihu9Cr4kzhxip5a-teiHb17HpCKFTPX3v3/exec";
      let fetchedExams: Exam[] = [];

      if (scriptUrl) {
        try {
          const res = await fetch(`${scriptUrl}?action=getExams`);
          const data = await res.json();
          
          let examsList: any[] = [];
          if (Array.isArray(data)) {
            examsList = data;
          } else if (data && Array.isArray(data.exams)) {
            examsList = data.exams;
          }

          if (examsList.length > 0) {
            fetchedExams = examsList.map((exam: any, idx: number) => {
              const rawStatus = String(exam.status || "draft").toLowerCase().trim();
              const isLiveStatus = rawStatus === "live";
              const isArchivedStatus = rawStatus === "archive" || rawStatus === "archived";
              return {
                id: exam.id || String(exam.tabName || `exam-${idx}`).toLowerCase().replace(/[^a-z0-9]/g, "-"),
                slNo: Number(exam.slNo) || (idx + 1),
                name: String(exam.name || exam.id || "Untitled Exam"),
                tabName: String(exam.tabName || exam.name || ""),
                timeLimit: Number(exam.timeLimit) || 15,
                status: isLiveStatus ? "live" : isArchivedStatus ? "archived" : "draft",
                examDate: exam.examDate || exam.examdate || exam.exam_date || exam.date ? String(exam.examDate || exam.examdate || exam.exam_date || exam.date).trim() : undefined
              };
            });
          }
        } catch (scriptErr) {
          console.warn("Could not load exams from Apps Script Web App:", scriptErr);
        }
      }

      // Load custom exams from localStorage
      let customExams: Exam[] = [];
      try {
        const customExamsStr = localStorage.getItem("customExams");
        if (customExamsStr) {
          customExams = JSON.parse(customExamsStr);
        }
      } catch (e) {
        console.error("Error reading customExams from localStorage", e);
      }

      // Combine fetched exams and custom exams
      let combinedExams = [...fetchedExams, ...customExams];
      if (combinedExams.length === 0) {
        combinedExams = [...DEFAULT_EXAMS];
      }

      // Sort by slNo
      combinedExams.sort((a, b) => a.slNo - b.slNo);
      setExams(combinedExams);
    } catch (err) {
      console.error("Error loading exams:", err);
      setExams(DEFAULT_EXAMS);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const url = await loadSettings();
      await loadExams(url);
    };
    init();
  }, []);

  useEffect(() => {
    // Sync browser URL pathname with current custom view
    try {
      if (currentView === "admin") {
        if (window.location.pathname !== "/admin") {
          window.history.pushState({}, "", "/admin");
        }
      } else {
        if (window.location.pathname === "/admin") {
          window.history.pushState({}, "", "/");
        }
      }
    } catch (e) {}

    // Event tracking on view transitions
    if (currentView === "home") {
      trackEvent("home_landing", { path: "/" });
    } else {
      trackEvent(`${currentView}_landing`, { path: `/${currentView}` });
    }
  }, [currentView]);

  const handleStartExam = (exam: Exam, username: string) => {
    trackEvent("start_exam", { examId: exam.id, examName: exam.name, username });
    setActiveExam(exam);
    setActiveCandidateName(username);
    setCurrentView("active_exam");
  };

  const handleExitExam = () => {
    setActiveExam(null);
    setActiveCandidateName("");
    setCurrentView("home");
    loadExams(); // Reload any updates
    fetchUserAttempts(currentUser); // Refresh completed attempts
  };

  const handleViewLeaderboardAfterQuiz = () => {
    setActiveExam(null);
    setActiveCandidateName("");
    setCurrentView("leaderboard");
    fetchUserAttempts(currentUser); // Refresh completed attempts
  };

  const liveExams = exams.filter(e => e.status === "live");
  const routineExams = exams
    .filter(e => e.examDate && e.status !== "archived" && e.status !== "archive")
    .sort((a, b) => parseExamDate(a.examDate) - parseExamDate(b.examDate) || a.slNo - b.slNo);
  const archiveExams = exams.filter(e => e.status === "archived" || e.status === "archive");

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans text-slate-900">
      {/* Navbar component */}
      <Navbar 
        currentUser={currentUser} 
        onOpenAuth={() => setIsAuthOpen(true)} 
        onViewChange={(view) => {
          if (view === "home") {
            trackEvent("home_click");
          } else {
            trackEvent(`${view}_click`);
          }
          if (activeExam) {
            if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
              handleExitExam();
              setCurrentView(view as any);
            }
          } else {
            setCurrentView(view as any);
          }
        }} 
        currentView={currentView}
        liveCount={liveExams.length}
        routineCount={routineExams.length}
        archiveCount={archiveExams.length}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          {currentView === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              {/* Introduction Hero Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="space-y-4 max-w-xl text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>পরবর্তী প্রজন্মের মূল্যায়ন ইঞ্জিন (Next-Gen Assessment)</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                    স্মার্ট অনলাইন পরীক্ষা পদ্ধতি (Smart Quiz System)
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    একটি সুনির্দিষ্ট কাঠামোর মধ্যে আপনার লজিক, সাধারণ জ্ঞান এবং দক্ষতার পরীক্ষা নিন। গুগল শিটের সাথে পরীক্ষা সংযুক্ত করুন অথবা আমাদের লাইভ পরীক্ষাগুলোতে অংশ নিয়ে মেধা তালিকায় স্থান অর্জন করুন।
                  </p>
                </div>

                <div className="w-full md:w-auto max-w-xs">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center min-w-[160px]">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">চলতি পরীক্ষা (Live Exams)</span>
                    <span className="text-3xl font-black text-blue-600 mt-1 block">
                      {liveExams.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carousel Banner for Ad */}
              <AdCarousel />

              {/* User Performance Analytics / Progress Tracking Section */}
              <UserPerformanceChart 
                attempts={userAttempts}
                onOpenAuth={() => setIsAuthOpen(true)}
                isLoggedIn={!!currentUser}
              />
            </motion.div>
          )}

          {currentView === "live" && (
            <motion.div
              key="live_exams"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span>চলতি পরীক্ষাসমূহ (Live Exams)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">বর্তমানে অংশ নেওয়ার জন্য উপলব্ধ পরীক্ষাসমূহ। কুইজে অংশ নিতে নিচের পরীক্ষাটি নির্বাচন করুন।</p>
                </div>
                <button 
                  onClick={() => loadExams()}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 self-start sm:auto cursor-pointer font-mono"
                  title="Reload Exams"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExams ? "animate-spin" : ""}`} />
                  <span>রিফ্রেশ করুন</span>
                </button>
              </div>

              {loadingExams ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 font-medium">পরীক্ষার সময়সূচী ডাউনলোড করা হচ্ছে...</p>
                </div>
              ) : (
                liveExams.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto space-y-3 my-8">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">বর্তমানে কোনো চলতি পরীক্ষা নেই।</p>
                    <p className="text-xs text-slate-400">পরীক্ষার রুটিন চেক করুন অথবা কুইজ লোড করতে পুনরায় চেষ্টা করুন।</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveExams.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        currentUser={currentUser}
                        onStartExam={handleStartExam}
                        isAttempted={attemptedExamIds.includes(exam.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </motion.div>
          )}

          {currentView === "routine" && (
            <motion.div
              key="routine_exams"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-500" />
                    <span>পরীক্ষার রুটিন (Exam Routine)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">আসন্ন পরীক্ষার তালিকা এবং প্রকাশের তারিখসমূহ।</p>
                </div>
                <button 
                  onClick={() => loadExams()}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 self-start sm:auto cursor-pointer font-mono"
                  title="Reload Exams"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExams ? "animate-spin" : ""}`} />
                  <span>রিফ্রেশ করুন</span>
                </button>
              </div>

              {loadingExams ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 font-medium">পরীক্ষার সময়সূচী ডাউনলোড করা হচ্ছে...</p>
                </div>
              ) : (
                routineExams.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto space-y-3 my-8">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">কোনো পরীক্ষার রুটিন নির্ধারিত নেই।</p>
                    <p className="text-xs text-slate-400">নতুন পরীক্ষার তারিখ নির্ধারণের জন্য গুগল শিটে examDate কলামে তারিখ (mm/dd/yy) যুক্ত করুন।</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routineExams.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        currentUser={currentUser}
                        onStartExam={handleStartExam}
                        isAttempted={attemptedExamIds.includes(exam.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </motion.div>
          )}

          {currentView === "archive" && (
            <motion.div
              key="archive_exams"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Archive className="w-6 h-6 text-slate-500" />
                    <span>আর্কাইভ পরীক্ষা (Archive Exams)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">পূর্ববর্তী সময়ে সমাপ্ত হওয়া পরীক্ষাসমূহের আর্কাইভ তালিকা।</p>
                </div>
                <button 
                  onClick={() => loadExams()}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 self-start sm:auto cursor-pointer font-mono"
                  title="Reload Exams"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExams ? "animate-spin" : ""}`} />
                  <span>রিফ্রেশ করুন</span>
                </button>
              </div>

              {loadingExams ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 font-medium">পরীক্ষার সময়সূচী ডাউনলোড করা হচ্ছে...</p>
                </div>
              ) : (
                archiveExams.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto space-y-3 my-8">
                    <Archive className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">আর্কাইভ করা কোনো পরীক্ষা পাওয়া যায়নি।</p>
                    <p className="text-xs text-slate-400">পরীক্ষা আর্কাইভ করতে গুগল শিটের status কলামে archive অথবা archived লিখুন।</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archiveExams.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        currentUser={currentUser}
                        onStartExam={handleStartExam}
                        isAttempted={attemptedExamIds.includes(exam.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </motion.div>
          )}

          {currentView === "active_exam" && activeExam && (
            <motion.div
              key="active_exam"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <ActiveExam
                exam={activeExam}
                username={activeCandidateName}
                currentUser={currentUser}
                googleAppsScriptUrl={googleAppsScriptUrl}
                onExit={handleExitExam}
                onViewLeaderboard={handleViewLeaderboardAfterQuiz}
              />
            </motion.div>
          )}

          {currentView === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <Leaderboard exams={exams} />
            </motion.div>
          )}

          {currentView === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto"
            >
              {!isAdminLoggedIn ? (
                <AdminLogin 
                  onLoginSuccess={() => {
                    setIsAdminLoggedIn(true);
                  }}
                  onBackToHome={() => {
                    setCurrentView("home");
                  }}
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Session Active</span>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAdminLoggedIn(false);
                        setCurrentView("home");
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Logout Session
                    </button>
                  </div>
                  <AdminSettings 
                    onSettingsSaved={async () => {
                      const url = await loadSettings();
                      await loadExams(url);
                    }}
                    examsList={exams}
                    onReloadExams={async () => {
                      const url = await loadSettings();
                      await loadExams(url);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer About, Socials, & Copyright */}
      <footer className="bg-white border-t border-slate-200 mt-16 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-100">
            {/* About Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">কুইজ মাস্টার প্রো</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                এটি একটি আধুনিক ও পরবর্তী প্রজন্মের অনলাইন মূল্যায়ন ইঞ্জিন। আমরা শিক্ষার্থীদের মেধা যাচাই ও দক্ষতা বৃদ্ধির লক্ষে বিভিন্ন বিষয়ের উপর লাইভ পরীক্ষা, সময়সূচীভিত্তিক রুটিন এবং আর্কাইভড কুইজ প্রদান করি।
              </p>
            </div>

            {/* Quick Stats/Links */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">দ্রুত সংযোগ (Quick Links)</h3>
              <ul className="text-xs text-slate-500 space-y-2">
                <li>
                  <button onClick={() => {
                    if (activeExam) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("exams");
                        setActiveExamTab("live");
                      }
                    } else {
                      setCurrentView("exams");
                      setActiveExamTab("live");
                    }
                  }} className="hover:text-blue-600 transition-colors cursor-pointer text-left">
                    • চলতি পরীক্ষা (Live Exam)
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    if (activeExam) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("exams");
                        setActiveExamTab("routine");
                      }
                    } else {
                      setCurrentView("exams");
                      setActiveExamTab("routine");
                    }
                  }} className="hover:text-blue-600 transition-colors cursor-pointer text-left">
                    • পরীক্ষার রুটিন (Exam Routine)
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    if (activeExam) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("exams");
                        setActiveExamTab("archive");
                      }
                    } else {
                      setCurrentView("exams");
                      setActiveExamTab("archive");
                    }
                  }} className="hover:text-blue-600 transition-colors cursor-pointer text-left">
                    • আর্কাইভ (Archive)
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    if (activeExam) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("leaderboard");
                      }
                    } else {
                      setCurrentView("leaderboard");
                    }
                  }} className="hover:text-blue-600 transition-colors cursor-pointer text-left">
                    • লাইভ মেধা তালিকা (Leaderboard)
                  </button>
                </li>
              </ul>
            </div>

            {/* Social Media Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">সোশ্যাল মিডিয়া (Social Media)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                আমাদের বিভিন্ন সামাজিক যোগাযোগ মাধ্যমে যুক্ত থাকুন এবং নতুন কুইজ ও আপডেট সম্পর্কে জানুন।
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-full flex items-center justify-center text-slate-500 transition-all cursor-pointer"
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full flex items-center justify-center text-slate-500 transition-all cursor-pointer"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 hover:bg-sky-50 hover:text-sky-500 rounded-full flex items-center justify-center text-slate-500 transition-all cursor-pointer"
                  title="Twitter/X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 hover:bg-pink-50 hover:text-pink-600 rounded-full flex items-center justify-center text-slate-500 transition-all cursor-pointer"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-full flex items-center justify-center text-slate-500 transition-all cursor-pointer"
                  title="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest gap-4">
            <div>কুইজ মাস্টার প্রো © {new Date().getFullYear()}</div>
            <div>সিস্টেম স্ট্যাটাস (System Status): <span className="text-green-600">সংযুক্ত (Connected)</span></div>
          </div>
        </div>
      </footer>

      {/* Auth Modal component */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        currentUser={currentUser} 
      />
    </div>
  );
}
