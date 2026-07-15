import React, { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, getDocs, getDoc, setDoc, doc, query, where } from "firebase/firestore";
import { Exam, Attempt } from "./types";
import { DEFAULT_EXAMS } from "./data";

// Components
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import ExamCard from "./components/ExamCard";
import ActiveExam from "./components/ActiveExam";
import Leaderboard from "./components/Leaderboard";
import Results from "./components/Results";
import UserPerformanceChart from "./components/UserPerformanceChart";
import AdCarousel from "./components/AdCarousel";
import AdminLogin from "./components/AdminLogin";
import AdminSettings from "./components/AdminSettings";
import UserManagement from "./components/UserManagement";
import AdManagement from "./components/AdManagement";
import Pricing from "./components/Pricing";
import PaymentModal from "./components/PaymentModal";
import PendingPayments from "./components/PendingPayments";
import AdminExamsSettings from "./components/AdminExamsSettings";
import AdminPackagesSettings from "./components/AdminPackagesSettings";
import AdminNotices from "./components/AdminNotices";
import MyResults from "./components/MyResults";
import MySubscriptions from "./components/MySubscriptions";
import AdminBlogManager from "./components/AdminBlogManager";
import BlogUser from "./components/BlogUser";

// Analytics
import { trackEvent, initGA } from "./lib/analytics";

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
  const [currentView, setCurrentView] = useState<"home" | "live" | "routine" | "archive" | "leaderboard" | "active_exam" | "admin" | "pricing" | "results" | "my_results" | "my_subscriptions" | "blog">(() => {
    try {
      if (typeof window !== "undefined" && window.location.pathname === "/admin") {
        return "admin";
      }
    } catch (e) {}
    return "home";
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<"users" | "ads" | "exams" | "exam_configs" | "packages" | "payments" | "notices" | "blogs">("users");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  // Theme settings
  const [theme, setTheme] = useState<"light" | "dark" | string>(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) {}
    return "light";
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // User Premium and Subscriptions state
  const [userPremiumUntil, setUserPremiumUntil] = useState<string | null>(null);
  const [userSubscriptions, setUserSubscriptions] = useState<{ [examId: string]: boolean }>({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Locked exam unlock/purchase state
  const [selectedUnlockExam, setSelectedUnlockExam] = useState<Exam | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // App settings & Exams state
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState(() => {
    try {
      return localStorage.getItem("googleAppsScriptUrl") || "";
    } catch (e) {
      return "";
    }
  });
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
  const [activeExamMode, setActiveExamMode] = useState<"take" | "retake" | "view_questions" | "view_result">("take");

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
        const snap = await getDocs(q).catch((getErr) => {
          handleFirestoreError(getErr, OperationType.LIST, "attempts");
          throw getErr;
        });
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

  // Helper to load premium membership and individual exam subscriptions
  const fetchUserPremiumAndSubscriptions = async (user: User) => {
    setLoadingSubscriptions(true);
    try {
      // 1. Fetch user document for premium date
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef).catch((getErr) => {
        handleFirestoreError(getErr, OperationType.GET, `users/${user.uid}`);
        throw getErr;
      });
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.premiumUntil) {
          setUserPremiumUntil(userData.premiumUntil);
        } else {
          setUserPremiumUntil(null);
        }
      } else {
        setUserPremiumUntil(null);
      }

      // 2. Fetch individual single-exam purchases
      const subsRef = collection(db, "users", user.uid, "subscriptions");
      const subsSnap = await getDocs(subsRef).catch((getErr) => {
        handleFirestoreError(getErr, OperationType.LIST, `users/${user.uid}/subscriptions`);
        throw getErr;
      });
      const activeSubs: { [examId: string]: boolean } = {};
      subsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isVerified === true || data.status === "verified") {
          activeSubs[docSnap.id] = true;
        }
      });
      setUserSubscriptions(activeSubs);
    } catch (err) {
      console.error("Error loading user subscriptions/premium:", err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Helper to verify if an exam is currently locked for the active user
  const isExamLockedForUser = (exam: Exam): boolean => {
    if (exam.isFree !== false) {
      return false; // Free exams are never locked
    }
    if (!currentUser) {
      return true; // Unauthenticated users cannot view paid exams
    }
    if (userPremiumUntil) {
      const expiry = new Date(userPremiumUntil).getTime();
      if (expiry > Date.now()) {
        return false; // Active monthly/yearly premium unlocks everything
      }
    }
    if (userSubscriptions[exam.id] === true) {
      return false; // Individual manual exam purchase verified
    }
    return true;
  };

  // Theme synchronization effect
  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme]);

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
        setUserPremiumUntil(null);
        setUserSubscriptions({});
      } else {
        fetchUserAttempts(user);
        fetchUserPremiumAndSubscriptions(user);

        // Auto-login as admin if they are authenticated as the admin email
        if (user.email === "admin@examportal.com" || user.email === "club.gobindapur@gmail.com") {
          setIsAdminLoggedIn(true);
        }
      }
    });
    return unsubscribe;
  }, []);

  // 1b. Auto-logout standard user when entering admin portal
  useEffect(() => {
    if (
      currentUser && 
      currentUser.email !== "admin@examportal.com" && 
      currentUser.email !== "club.gobindapur@gmail.com" && 
      (currentView === "admin" || window.location.pathname === "/admin")
    ) {
      signOut(auth)
        .then(() => {
          trackEvent("admin_portal_auto_logout_success", { email: currentUser.email });
          setCurrentUser(null);
        })
        .catch((err) => {
          console.error("Error signing out user for admin portal", err);
        });
    }
  }, [currentUser, currentView]);

  // 2. Load Google Apps Script URL settings & GA4 settings from Firestore and LocalStorage
  const loadSettings = async (): Promise<string> => {
    try {
      // 1. Check local storage first for quick boot
      const savedUrl = localStorage.getItem("googleAppsScriptUrl") || "";
      setGoogleAppsScriptUrl(savedUrl);

      const savedGaId = localStorage.getItem("gaMeasurementId") || "";
      if (savedGaId) {
        initGA(savedGaId);
      }

      // 2. Load fresh from Firestore settings/general
      const docRef = doc(db, "settings", "general");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.googleAppsScriptUrl) {
          localStorage.setItem("googleAppsScriptUrl", data.googleAppsScriptUrl);
          setGoogleAppsScriptUrl(data.googleAppsScriptUrl);
          return data.googleAppsScriptUrl;
        }
      }

      return savedUrl;
    } catch (err) {
      console.error("Error loading settings from Firestore/LocalStorage:", err);
      return localStorage.getItem("googleAppsScriptUrl") || "";
    }
  };

  // 3. Load or seed exams list
  const loadExams = async (currentUrl?: string) => {
    setLoadingExams(true);
    try {
      let fetchedExams: Exam[] = [];

      try {
        const examListSnap = await getDocs(collection(db, "examList"));
        if (!examListSnap.empty) {
          examListSnap.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedExams.push({
              id: docSnap.id,
              slNo: Number(data.slNo) || 1,
              name: String(data.name || ""),
              tabName: String(data.tabName || ""),
              timeLimit: Number(data.timeLimit) || 15,
              status: String(data.status || "draft"),
              examDate: data.examDate ? String(data.examDate) : undefined,
              markPerQuestion: data.markPerQuestion !== undefined ? Number(data.markPerQuestion) : 1,
              penaltyMark: data.penaltyMark !== undefined ? Number(data.penaltyMark) : 0.25,
              isFree: data.isFree !== undefined ? Boolean(data.isFree) : true,
              price: data.price !== undefined ? Number(data.price) : 0,
              showResult: data.showResult !== undefined ? Boolean(data.showResult) : false,
              passPercentage: data.passPercentage !== undefined ? Number(data.passPercentage) : 40,
              minPassMark: data.minPassMark !== undefined ? Number(data.minPassMark) : 0
            });
          });
        } else {
          // Collection is empty, let's seed it with DEFAULT_EXAMS!
          console.log("examList collection is empty, seeding with DEFAULT_EXAMS...");
          for (const exam of DEFAULT_EXAMS) {
            const examDocRef = doc(db, "examList", exam.id);
            const examData = {
              id: exam.id,
              slNo: exam.slNo,
              name: exam.name,
              tabName: exam.tabName,
              timeLimit: exam.timeLimit,
              status: exam.status,
              isFree: exam.isFree !== undefined ? exam.isFree : true,
              price: exam.price !== undefined ? exam.price : 0,
              markPerQuestion: exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1,
              penaltyMark: exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25
            };
            try {
              await setDoc(examDocRef, examData);
            } catch (err) {
              console.warn(`Failed to seed exam ${exam.id}:`, err);
            }
            fetchedExams.push(examData);
          }
        }
      } catch (fsListErr) {
        console.error("Error loading examList from Firestore, falling back:", fsListErr);
        fetchedExams = [...DEFAULT_EXAMS].map(exam => ({
          ...exam,
          markPerQuestion: exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1,
          penaltyMark: exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25,
          isFree: exam.isFree !== undefined ? exam.isFree : true,
          price: exam.price !== undefined ? exam.price : 0
        }));
      }

      // Sort by slNo
      fetchedExams.sort((a, b) => a.slNo - b.slNo);
      setExams(fetchedExams);
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

  const handleStartExam = (exam: Exam, username: string, mode: "take" | "retake" | "view_questions" | "view_result" = "take") => {
    trackEvent("start_exam", { examId: exam.id, examName: exam.name, username, mode });
    setActiveExam(exam);
    setActiveCandidateName(username);
    setActiveExamMode(mode);
    setCurrentView("active_exam");
  };

  const handleExitExam = () => {
    setActiveExam(null);
    setActiveCandidateName("");
    setActiveExamMode("take");
    setCurrentView("home");
    loadExams(); // Reload any updates
    fetchUserAttempts(currentUser); // Refresh completed attempts
  };

  const handleViewLeaderboardAfterQuiz = () => {
    setActiveExam(null);
    setActiveCandidateName("");
    setActiveExamMode("take");
    setCurrentView("leaderboard");
    fetchUserAttempts(currentUser); // Refresh completed attempts
  };

  const liveExams = exams.filter(e => e.status === "live");
  const routineExams = exams
    .filter(e => e.examDate && e.status !== "archived" && e.status !== "archive")
    .sort((a, b) => parseExamDate(a.examDate) - parseExamDate(b.examDate) || a.slNo - b.slNo);
  const archiveExams = exams.filter(e => e.status === "archived" || e.status === "archive");

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navbar component */}
      {currentView === "admin" && isAdminLoggedIn ? (
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 flex-shrink-0 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-4">
              {/* Brand Logo */}
              <div 
                onClick={() => {
                  setIsAdminLoggedIn(false);
                  setCurrentView("home");
                  trackEvent("admin_navbar_logo_click");
                }}
                className="flex items-center gap-3 cursor-pointer hover:opacity-95 transition-opacity shrink-0"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm font-black text-sm">
                  A
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-1.5">
                    <span>Admin Dashboard</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </span>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                <button
                  onClick={() => {
                    setActiveAdminTab("users");
                    trackEvent("admin_nav_users_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "users"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  User Management
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("ads");
                    trackEvent("admin_nav_ads_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "ads"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Ad Management
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("exams");
                    trackEvent("admin_nav_exams_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "exams"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  App Settings
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("exam_configs");
                    trackEvent("admin_nav_exam_configs_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "exam_configs"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Exams & Marking
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("packages");
                    trackEvent("admin_nav_packages_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "packages"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Premium Packages
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("payments");
                    trackEvent("admin_nav_payments_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "payments"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Pending Payments
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("notices");
                    trackEvent("admin_nav_notices_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "notices"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Notice Board
                </button>

                <button
                  onClick={() => {
                    setActiveAdminTab("blogs");
                    trackEvent("admin_nav_blogs_click");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeAdminTab === "blogs"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Blog Articles
                </button>

                <div className="w-[1px] h-5 bg-slate-800 mx-1 shrink-0" />

                <button
                  onClick={() => {
                    setIsAdminLoggedIn(false);
                    setCurrentView("home");
                    trackEvent("admin_logout_click");
                  }}
                  className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      ) : (
        <Navbar 
          currentUser={currentUser} 
          onOpenAuth={() => setIsAuthOpen(true)} 
          onViewChange={(view) => {
            if (view === "home") {
              trackEvent("home_click");
            } else {
              trackEvent(`${view}_click`);
            }
            const isExamActive = activeExam && (activeExamMode === "take" || activeExamMode === "retake");
            if (isExamActive) {
              if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                handleExitExam();
                setCurrentView(view as any);
              }
            } else {
              if (activeExam) {
                setActiveExam(null);
                setActiveCandidateName("");
                setActiveExamMode("take");
              }
              setCurrentView(view as any);
            }
          }} 
          currentView={currentView}
          liveCount={liveExams.length}
          routineCount={routineExams.length}
          archiveCount={archiveExams.length}
          theme={theme as any}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Main Container */}
      <main className={`flex-grow w-full pb-10 transition-all ${
        (currentView === "admin" && isAdminLoggedIn) 
          ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10" 
          : "lg:pl-64 pt-10 lg:pt-24"
      }`}>
        <div className={(currentView === "admin" && isAdminLoggedIn) ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="space-y-4 max-w-xl text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>পরবর্তী প্রজন্মের মূল্যায়ন ইঞ্জিন (Next-Gen Assessment)</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
                    স্মার্ট অনলাইন পরীক্ষা পদ্ধতি (Smart Quiz System)
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    একটি সুনির্দিষ্ট কাঠামোর মধ্যে আপনার লজিক, সাধারণ জ্ঞান এবং দক্ষতার পরীক্ষা নিন। গুগল শিটের সাথে পরীক্ষা সংযুক্ত করুন অথবা আমাদের লাইভ পরীক্ষাগুলোতে অংশ নিয়ে মেধা তালিকায় স্থান অর্জন করুন।
                  </p>
                </div>

                <div className="w-full md:w-auto max-w-xs">
                  <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-center min-w-[160px]">
                    <span className="text-xs text-slate-400 dark:text-slate-550 font-bold block uppercase tracking-wider">চলতি পরীক্ষা (Live Exams)</span>
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
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
                theme={theme as any}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span>চলতি পরীক্ষাসমূহ (Live Exams)</span>
                  </h2>
                  <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">বর্তমানে অংশ নেওয়ার জন্য উপলব্ধ পরীক্ষাসমূহ। কুইজে অংশ নিতে নিচের পরীক্ষাটি নির্বাচন করুন।</p>
                </div>
                <button 
                  onClick={() => loadExams()}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 self-start sm:auto cursor-pointer font-mono"
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
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3 my-8">
                    <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">বর্তমানে কোনো চলতি পরীক্ষা নেই।</p>
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
                        isLocked={isExamLockedForUser(exam)}
                        onUnlock={(lockedExam) => {
                          if (!currentUser) {
                            setIsAuthOpen(true);
                            return;
                          }
                          setSelectedUnlockExam(lockedExam);
                          setIsUnlockModalOpen(true);
                        }}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-500" />
                    <span>পরীক্ষার রুটিন (Exam Routine)</span>
                  </h2>
                  <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">আসন্ন পরীক্ষার তালিকা এবং প্রকাশের তারিখসমূহ।</p>
                </div>
                <button 
                  onClick={() => loadExams()}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 self-start sm:auto cursor-pointer font-mono"
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
                <>
                  {routineExams.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3 my-8">
                      <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">কোনো পরীক্ষার রুটিন নির্ধারিত নেই।</p>
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
                          isLocked={isExamLockedForUser(exam)}
                          onUnlock={(lockedExam) => {
                            if (!currentUser) {
                              setIsAuthOpen(true);
                              return;
                            }
                            setSelectedUnlockExam(lockedExam);
                            setIsUnlockModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Persistent Weekly Schedule Table */}
                  <div className="mt-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 max-w-4xl mx-auto shadow-sm">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">সাপ্তাহিক নিয়মিত পরীক্ষার রুটিন</h3>
                        <p className="text-xs text-slate-400 mt-0.5">BCS, প্রাইমারি ও অন্যান্য সরকারি চাকরি পরীক্ষার নিয়মিত সময়সূচী</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-350 font-bold border-b border-slate-100 dark:border-slate-800 uppercase">
                            <th className="py-3 px-4 font-bold">পরীক্ষার দিন</th>
                            <th className="py-3 px-4 font-bold">বিষয় ও অধ্যায়</th>
                            <th className="py-3 px-4 font-bold">সময়সীমা ও পূর্ণমান</th>
                            <th className="py-3 px-4 font-bold text-center">পরীক্ষার সময়</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-350">
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-4 px-4 font-bold text-indigo-600 dark:text-indigo-400">শনিবার (Saturday)</td>
                            <td className="py-4 px-4 font-semibold">বাংলা ভাষা, ব্যাকরণ ও বাংলা সাহিত্য এবং মানসিক দক্ষতা</td>
                            <td className="py-4 px-4 font-mono font-medium">৩০ মিনিট | ৫০ নম্বর</td>
                            <td className="py-4 px-4 text-center"><span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg">রাত ০৯:০০ টা</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-4 px-4 font-bold text-indigo-600 dark:text-indigo-400">সোমবার (Monday)</td>
                            <td className="py-4 px-4 font-semibold">সাধারণ জ্ঞান, বাংলাদেশ ও আন্তর্জাতিক বিষয়াবলী এবং সাম্প্রতিক</td>
                            <td className="py-4 px-4 font-mono font-medium">৩০ মিনিট | ৫০ নম্বর</td>
                            <td className="py-4 px-4 text-center"><span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg">রাত ০৯:০০ টা</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-4 px-4 font-bold text-indigo-600 dark:text-indigo-400">বুধবার (Wednesday)</td>
                            <td className="py-4 px-4 font-semibold">ইংরেজি ভাষা ও সাহিত্য, গাণিতিক যুক্তি ও শর্টকাট টেকনিকস</td>
                            <td className="py-4 px-4 font-mono font-medium">৩০ মিনিট | ৫০ নম্বর</td>
                            <td className="py-4 px-4 text-center"><span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold rounded-lg">রাত ০৯:০০ টা</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      💡 <b>রুটিন নির্দেশিকা:</b> নির্ধারিত দিনে রাত ০৯:০০ মিনিটে লাইভ পরীক্ষা চালু করা হবে। পরীক্ষা শেষ হওয়ার পর প্রতিটি প্রশ্নের সমাধান ও ফলাফল স্বয়ংক্রিয়ভাবে প্রকাশ পাবে।
                    </div>
                  </div>
                </>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                    <Archive className="w-6 h-6 text-slate-500" />
                    <span>আর্কাইভ পরীক্ষা (Archive Exams)</span>
                  </h2>
                  <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">পূর্ববর্তী সময়ে সমাপ্ত হওয়া পরীক্ষাসমূহের আর্কাইভ তালিকা।</p>
                </div>
                <button 
                  onClick={() => loadExams()}
                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 self-start sm:auto cursor-pointer font-mono"
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
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto space-y-3 my-8">
                    <Archive className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">আর্কাইভ করা কোনো পরীক্ষা পাওয়া যায়নি।</p>
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
                        isLocked={isExamLockedForUser(exam)}
                        onUnlock={(lockedExam) => {
                          if (!currentUser) {
                            setIsAuthOpen(true);
                            return;
                          }
                          setSelectedUnlockExam(lockedExam);
                          setIsUnlockModalOpen(true);
                        }}
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
                mode={activeExamMode}
                userPremiumUntil={userPremiumUntil}
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

          {currentView === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <Results exams={exams} />
            </motion.div>
          )}

          {currentView === "pricing" && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <Pricing 
                currentUser={currentUser} 
                onOpenAuth={() => setIsAuthOpen(true)} 
                onSuccessPayment={() => {
                  if (currentUser) {
                    fetchUserPremiumAndSubscriptions(currentUser);
                  }
                }}
              />
            </motion.div>
          )}

          {currentView === "my_results" && (
            <motion.div
              key="my_results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <MyResults 
                currentUser={currentUser} 
                onOpenAuth={() => setIsAuthOpen(true)}
                exams={exams}
              />
            </motion.div>
          )}

          {currentView === "my_subscriptions" && (
            <motion.div
              key="my_subscriptions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <MySubscriptions 
                currentUser={currentUser} 
                onOpenAuth={() => setIsAuthOpen(true)}
                onViewChange={(view) => setCurrentView(view)}
              />
            </motion.div>
          )}

          {currentView === "blog" && (
            <motion.div
              key="blog"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <BlogUser />
            </motion.div>
          )}

          {currentView === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-6xl mx-auto"
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
                  {activeAdminTab === "users" && (
                    <UserManagement />
                  )}
                  {activeAdminTab === "ads" && (
                    <AdManagement />
                  )}
                  {activeAdminTab === "exams" && (
                    <AdminSettings 
                      onSettingsSaved={async () => {
                        const url = await loadSettings();
                        await loadExams(url);
                      }}
                      onReloadExams={async () => {
                        const url = await loadSettings();
                        await loadExams(url);
                      }}
                    />
                  )}
                  {activeAdminTab === "exam_configs" && (
                    <AdminExamsSettings 
                      exams={exams}
                      onReload={async () => {
                        const url = await loadSettings();
                        await loadExams(url);
                      }}
                    />
                  )}
                  {activeAdminTab === "packages" && (
                    <AdminPackagesSettings />
                  )}
                  {activeAdminTab === "payments" && (
                    <PendingPayments />
                  )}
                  {activeAdminTab === "notices" && (
                    <AdminNotices />
                  )}
                  {activeAdminTab === "blogs" && (
                    <AdminBlogManager />
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* Footer About, Socials, & Copyright */}
      <footer className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-16 flex-shrink-0 transition-all duration-300 ${
        (currentView === "admin" && isAdminLoggedIn) ? "" : "lg:pl-64"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
            {/* About Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">কুইজ মাস্টার প্রো</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                এটি একটি আধুনিক ও পরবর্তী প্রজন্মের অনলাইন মূল্যায়ন ইঞ্জিন। আমরা শিক্ষার্থীদের মেধা যাচাই ও দক্ষতা বৃদ্ধির লক্ষে বিভিন্ন বিষয়ের উপর লাইভ পরীক্ষা, সময়সূচীভিত্তিক রুটিন এবং আর্কাইভড কুইজ প্রদান করি।
              </p>
            </div>

            {/* Quick Stats/Links */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">দ্রুত সংযোগ (Quick Links)</h3>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <li>
                  <button onClick={() => {
                    const isExamActive = activeExam && (activeExamMode === "take" || activeExamMode === "retake");
                    if (isExamActive) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("live");
                        setActiveExamTab("live");
                      }
                    } else {
                      if (activeExam) {
                        setActiveExam(null);
                        setActiveCandidateName("");
                        setActiveExamMode("take");
                      }
                      setCurrentView("live");
                      setActiveExamTab("live");
                    }
                  }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left">
                    • চলতি পরীক্ষা (Live Exam)
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    const isExamActive = activeExam && (activeExamMode === "take" || activeExamMode === "retake");
                    if (isExamActive) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("routine");
                        setActiveExamTab("routine");
                      }
                    } else {
                      if (activeExam) {
                        setActiveExam(null);
                        setActiveCandidateName("");
                        setActiveExamMode("take");
                      }
                      setCurrentView("routine");
                      setActiveExamTab("routine");
                    }
                  }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left">
                    • পরীক্ষার রুটিন (Exam Routine)
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    const isExamActive = activeExam && (activeExamMode === "take" || activeExamMode === "retake");
                    if (isExamActive) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("archive");
                        setActiveExamTab("archive");
                      }
                    } else {
                      if (activeExam) {
                        setActiveExam(null);
                        setActiveCandidateName("");
                        setActiveExamMode("take");
                      }
                      setCurrentView("archive");
                      setActiveExamTab("archive");
                    }
                  }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left">
                    • আর্কাইভ (Archive)
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    const isExamActive = activeExam && (activeExamMode === "take" || activeExamMode === "retake");
                    if (isExamActive) {
                      if (window.confirm("আপনি একটি সক্রিয় পরীক্ষা দিচ্ছেন। চলে গেলে আপনার অগ্রগতি হারিয়ে যাবে। আপনি কি নিশ্চিত?")) {
                        handleExitExam();
                        setCurrentView("leaderboard");
                      }
                    } else {
                      if (activeExam) {
                        setActiveExam(null);
                        setActiveCandidateName("");
                        setActiveExamMode("take");
                      }
                      setCurrentView("leaderboard");
                    }
                  }} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left">
                    • লাইভ মেধা তালিকা (Leaderboard)
                  </button>
                </li>
              </ul>
            </div>

            {/* Social Media Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">সোশ্যাল মিডিয়া (Social Media)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                আমাদের বিভিন্ন সামাজিক যোগাযোগ মাধ্যমে যুক্ত থাকুন এবং নতুন কুইজ ও আপডেট সম্পর্কে জানুন।
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:text-sky-500 dark:hover:text-sky-450 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Twitter/X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:text-pink-600 dark:hover:text-pink-400 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest gap-4">
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
        userAttempts={userAttempts}
        exams={exams}
      />

      {/* Payment Modal for unlocked exams */}
      {selectedUnlockExam && (
        <PaymentModal
          isOpen={isUnlockModalOpen}
          onClose={() => {
            setIsUnlockModalOpen(false);
            setSelectedUnlockExam(null);
          }}
          currentUser={currentUser}
          paymentType="exam"
          price={selectedUnlockExam.price || 0}
          productName={selectedUnlockExam.name}
          productId={selectedUnlockExam.id}
          onSuccess={() => {
            if (currentUser) {
              fetchUserPremiumAndSubscriptions(currentUser);
            }
          }}
        />
      )}
    </div>
  );
}
