import React, { useState, useEffect } from "react";
import { 
  LogIn, Trophy, GraduationCap, Calendar, Archive, Home, Sparkles, Sun, 
  Moon, Menu, X, Bell, CheckCheck, ArrowRight, Inbox, Eye, Award, BookOpen,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

interface NavbarProps {
  currentUser: any;
  onOpenAuth: () => void;
  onViewChange: (view: "home" | "live" | "routine" | "archive" | "leaderboard" | "pricing" | "results" | "my_results" | "my_subscriptions" | "blog" | "helpline") => void;
  currentView: string;
  liveCount: number;
  routineCount: number;
  archiveCount: number;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function Navbar({ 
  currentUser, 
  onOpenAuth, 
  onViewChange, 
  currentView,
  liveCount,
  routineCount,
  archiveCount,
  theme,
  toggleTheme
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Real-time notices state
  const [notices, setNotices] = useState<any[]>([]);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("readNoticeIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen to live notices real-time
  useEffect(() => {
    const q = query(collection(db, "notices"), where("isLive", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first by createdAt
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      // Filter client side based on currentUser
      const userId = currentUser?.uid;
      const filtered = list.filter((n) => n.user === "all" || (userId && n.user === userId));
      setNotices(filtered);
    }, (err) => {
      console.error("Error listening to notices:", err);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notices.filter(n => !readNoticeIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const newReadIds = Array.from(new Set([...readNoticeIds, ...notices.map(n => n.id)]));
    setReadNoticeIds(newReadIds);
    localStorage.setItem("readNoticeIds", JSON.stringify(newReadIds));
  };

  const handleNoticeClick = (notice: any) => {
    // Mark as read
    if (!readNoticeIds.includes(notice.id)) {
      const newReadIds = [...readNoticeIds, notice.id];
      setReadNoticeIds(newReadIds);
      localStorage.setItem("readNoticeIds", JSON.stringify(newReadIds));
    }
    setSelectedNotice(notice);
  };

  const handleNoticeAction = (deeplink: string) => {
    if (deeplink) {
      onViewChange(deeplink as any);
      setIsNoticeOpen(false);
      setSelectedNotice(null);
      setIsOpen(false);
    }
  };

  const handleNavClick = (view: "home" | "live" | "routine" | "archive" | "leaderboard" | "pricing" | "results" | "my_results" | "my_subscriptions") => {
    onViewChange(view);
    setIsOpen(false);
  };

  const navItems = [
    {
      id: "home",
      label: "হোম",
      icon: <Home className="w-4 h-4 text-blue-500 shrink-0" />,
      activeClass: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "live",
      label: `চলতি পরীক্ষা (${liveCount})`,
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      ),
      activeClass: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "routine",
      label: `পরীক্ষার রুটিন (${routineCount})`,
      icon: <Calendar className="w-4 h-4 text-blue-500 shrink-0" />,
      activeClass: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "archive",
      label: `আর্কাইভ (${archiveCount})`,
      icon: <Archive className="w-4 h-4 text-slate-500 shrink-0" />,
      activeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "leaderboard",
      label: "লিডারবোর্ড",
      icon: <Trophy className="w-4 h-4 text-indigo-500 shrink-0" />,
      activeClass: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "results",
      label: "ফলাফল (Results)",
      icon: <Award className="w-4 h-4 text-emerald-500 shrink-0" />,
      activeClass: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "my_results",
      label: "আমার ফলাফল (My Results)",
      icon: <Award className="w-4 h-4 text-indigo-500 shrink-0" />,
      activeClass: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "my_subscriptions",
      label: "আমার সাবস্ক্রিপশন",
      icon: <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />,
      activeClass: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-100 dark:border-amber-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "blog",
      label: "ব্লগ ও গাইডলাইন (Blog)",
      icon: <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />,
      activeClass: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "helpline",
      label: "হেল্পলাইন (Helpline)",
      icon: <HelpCircle className="w-4 h-4 text-rose-550 dark:text-rose-400 shrink-0" />,
      activeClass: "bg-rose-50 dark:bg-rose-950/20 text-rose-605 dark:text-rose-400 font-bold border border-rose-100 dark:border-rose-900/35",
      inactiveClass: "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    },
    {
      id: "pricing",
      label: "প্রিমিয়াম কিনুন",
      icon: <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />,
      activeClass: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-black border border-amber-100 dark:border-amber-900/35",
      inactiveClass: "text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 font-bold"
    }
  ];

  return (
    <>
      {/* Desktop Horizontal Header Navigation - Top Right Corner */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-850 z-30 items-center justify-end px-8 gap-4 transition-colors">
        {/* Notice Bell Icon */}
        <button
          type="button"
          onClick={() => setIsNoticeOpen(true)}
          className="p-2 relative text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-150 dark:hover:border-slate-800 shadow-xs"
          title="নোটিশ বোর্ড (Notice Board)"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800" />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-150 dark:hover:border-slate-800 shadow-xs"
          title={theme === "dark" ? "লাইট থিম চালু করুন" : "ডার্ক থিম চালু করুন"}
        >
          {theme === "dark" ? (
            <Sun className="w-4.5 h-4.5 text-amber-500" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-slate-500" />
          )}
        </button>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800" />

        {/* User profile / Auth button */}
        {currentUser ? (
          <button
            id="btn-profile-desktop"
            onClick={onOpenAuth}
            className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-1.5 rounded-xl transition-all cursor-pointer text-left min-w-0 shadow-xs"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-sm">
              {currentUser.displayName ? currentUser.displayName[0] : currentUser.email[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate leading-none">
                {currentUser.displayName || "পরীক্ষার্থী"}
              </p>
            </div>
          </button>
        ) : (
          <button
            id="btn-signin-desktop"
            onClick={onOpenAuth}
            className="py-2 px-5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-transparent"
          >
            <LogIn className="w-4.5 h-4.5" />
            <span>লগইন করুন</span>
          </button>
        )}
      </header>

      {/* Desktop Vertical Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 z-40 transition-all duration-300 font-sans p-6 overflow-y-auto">
        {/* Brand/Logo Section */}
        <div 
          onClick={() => handleNavClick("home")}
          className="flex items-center gap-3 cursor-pointer hover:opacity-95 transition-opacity mb-8 shrink-0"
          id="brand-logo"
        >
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
            <GraduationCap className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-white leading-tight truncate">
              কুইজ মাস্টার <span className="text-blue-600 dark:text-blue-400 font-black">প্রো</span>
            </h2>
          </div>
        </div>

        {/* Vertical Nav List */}
        <nav className="flex flex-col gap-2 flex-grow">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => handleNavClick(item.id as any)}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3.5 cursor-pointer text-left shrink-0 ${
                currentView === item.id ? item.activeClass : item.inactiveClass
              }`}
            >
              <span className="shrink-0 scale-110">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Simplified clean Sidebar bottom footer */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800 shrink-0 text-center">
          <p className="text-[10px] text-slate-400 font-medium">© ২০২৬ কুইজ মাস্টার প্রো</p>
        </div>
      </aside>

      {/* Mobile Top Header Navigation */}
      <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 sticky top-0 z-50 flex-shrink-0 transition-colors font-sans h-16 flex items-center">
        <div className="w-full px-4">
          <div className="flex justify-between items-center h-full">
            {/* Logo & Brand */}
            <div 
              onClick={() => handleNavClick("home")}
              className="flex items-center gap-3 cursor-pointer hover:opacity-95 transition-opacity shrink-0"
              id="brand-logo-mobile"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-800 dark:text-white">
                  কুইজ মাস্টার <span className="text-blue-600 dark:text-blue-400 font-extrabold">প্রো</span>
                </span>
              </div>
            </div>

            {/* Mobile Right Controls: Bell, Theme toggle, profile/login, and Hamburger */}
            <div className="flex items-center gap-1.5">
              {/* Notice Bell on Mobile */}
              <button
                type="button"
                onClick={() => setIsNoticeOpen(true)}
                className="p-2 relative text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                title="নোটিশ"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>

              {/* Theme Toggle always visible */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                title={theme === "dark" ? "লাইট থিম" : "ডার্ক থিম"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Profile/Login icon shortcut */}
              {currentUser ? (
                <button
                  onClick={onOpenAuth}
                  className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase cursor-pointer shrink-0"
                >
                  {currentUser.displayName ? currentUser.displayName[0] : currentUser.email[0]}
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="p-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}

              {/* Hamburger Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg focus:outline-none transition-colors cursor-pointer ml-1"
                aria-label="Toggle Menu"
              >
                {isOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />

            {/* Side Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl z-50 p-6 flex flex-col gap-6 lg:hidden border-l border-slate-100 dark:border-slate-800"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-800">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">মেনু (Navigation)</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    id={`nav-btn-mobile-${item.id}`}
                    onClick={() => handleNavClick(item.id as any)}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                      currentView === item.id ? item.activeClass : item.inactiveClass
                    }`}
                  >
                    <span className="scale-110 shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* Drawer Footer / Account section info */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-3">
                {currentUser ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase">
                      {currentUser.displayName ? currentUser.displayName[0] : currentUser.email[0]}
                    </div>
                    <div className="text-left overflow-hidden">
                      <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-200 block truncate">
                        {currentUser.displayName || "পরীক্ষার্থী"}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate font-mono">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>লগইন করুন</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notice List Modal */}
      <AnimatePresence>
        {isNoticeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoticeOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden flex flex-col max-h-[85vh] text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500 animate-swing" />
                  <div>
                    <h3 className="text-base font-black text-slate-850 dark:text-white">নোটিশ বোর্ড (Notice Board)</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 px-1.5 py-0.5 rounded-md font-bold mt-0.5 inline-block">
                        {unreadCount}টি নতুন নোটিশ
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>সব পঠিত চিহ্নিত করুন</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsNoticeOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                {notices.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-2">
                    <Inbox className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">এই মুহূর্তে কোনো নোটিশ নেই।</p>
                    <p className="text-[10px] text-slate-405">নতুন নোটিশ প্রকাশিত হলে এখানে দেখতে পারবেন।</p>
                  </div>
                ) : (
                  notices.map((notice) => {
                    const isRead = readNoticeIds.includes(notice.id);
                    return (
                      <div
                        key={notice.id}
                        onClick={() => handleNoticeClick(notice)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isRead
                            ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            : "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-100/70 dark:border-indigo-900/20 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20"
                        }`}
                      >
                        {!isRead && (
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
                        )}

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-mono">
                              {new Date(notice.createdAt || Date.now()).toLocaleDateString("bn-BD")}
                            </span>
                            {!isRead && (
                              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            )}
                          </div>

                          <p className="text-xs text-slate-750 dark:text-slate-200 font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-3 leading-relaxed">
                            {notice.noticeText}
                          </p>

                          {notice.deeplink && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-indigo-500 group-hover:underline pt-1">
                              <span>বিস্তারিত দেখুন</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notice Detail View Dialog */}
      <AnimatePresence>
        {selectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNotice(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-left space-y-5"
            >
              {/* Close Icon */}
              <button
                onClick={() => setSelectedNotice(null)}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  নোটিফিকেশন বিবরণ
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  প্রকাশের সময়: {new Date(selectedNotice.createdAt || Date.now()).toLocaleString("bn-BD")}
                </span>
              </div>

              {/* Text content with beautiful line heights */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedNotice.noticeText}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                {selectedNotice.deeplink && (
                  <button
                    onClick={() => handleNoticeAction(selectedNotice.deeplink)}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>গন্তব্য পেজে প্রবেশ করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
