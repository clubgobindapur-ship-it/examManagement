import React from "react";
import { LogIn, User, Trophy, HelpCircle, GraduationCap, Calendar, Archive, Home, Sparkles, Sun, Moon } from "lucide-react";

interface NavbarProps {
  currentUser: any;
  onOpenAuth: () => void;
  onViewChange: (view: "home" | "live" | "routine" | "archive" | "leaderboard" | "pricing") => void;
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
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 sticky top-0 z-50 flex-shrink-0 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo & Brand */}
          <div 
            onClick={() => onViewChange("home")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-95 transition-opacity shrink-0"
            id="brand-logo"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
                কুইজ মাস্টার <span className="text-blue-600 dark:text-blue-400 font-extrabold">প্রো</span>
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1" id="nav-actions" style={{ scrollbarWidth: "none" }}>
            <button
              id="nav-btn-home"
              onClick={() => onViewChange("home")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                currentView === "home"
                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 font-bold border border-blue-100 dark:border-blue-900/35"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Home className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>হোম</span>
            </button>

            <button
              id="nav-btn-live-exam"
              onClick={() => onViewChange("live")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                currentView === "live"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 font-bold border border-emerald-100 dark:border-emerald-900/35"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>চলতি পরীক্ষা ({liveCount})</span>
            </button>

            <button
              id="nav-btn-routine"
              onClick={() => onViewChange("routine")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                currentView === "routine"
                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 font-bold border border-blue-100 dark:border-blue-900/35"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>পরীক্ষার রুটিন ({routineCount})</span>
            </button>

            <button
              id="nav-btn-archive"
              onClick={() => onViewChange("archive")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                currentView === "archive"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>আর্কাইভ ({archiveCount})</span>
            </button>

            <button
              id="nav-btn-leaderboard"
              onClick={() => onViewChange("leaderboard")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                currentView === "leaderboard"
                  ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-450 font-bold border border-indigo-100 dark:border-indigo-900/35"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>লিডারবোর্ড</span>
            </button>

            <button
              id="nav-btn-pricing"
              onClick={() => onViewChange("pricing")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                currentView === "pricing"
                  ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 font-black border border-amber-100 dark:border-amber-900/35"
                  : "text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>প্রিমিয়াম কিনুন</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer shrink-0"
              title={theme === "dark" ? "লাইট থিম চালু করুন" : "ডার্ক থিম চালু করুন"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Auth section */}
            {currentUser ? (
              <button
                id="btn-profile"
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-full transition-all cursor-pointer shrink-0"
              >
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {currentUser.displayName ? currentUser.displayName[0] : currentUser.email[0]}
                </div>
                <span className="text-xs font-semibold max-w-[80px] truncate hidden md:inline">
                  {currentUser.displayName || "পরীক্ষার্থী"}
                </span>
              </button>
            ) : (
              <button
                id="btn-signin"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 py-1.5 px-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium rounded-full shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>লগইন করুন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
