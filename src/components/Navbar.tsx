import React from "react";
import { LogIn, User, Trophy, HelpCircle, GraduationCap, Calendar, Archive, Home } from "lucide-react";

interface NavbarProps {
  currentUser: any;
  onOpenAuth: () => void;
  onViewChange: (view: "home" | "live" | "routine" | "archive" | "leaderboard") => void;
  currentView: string;
  liveCount: number;
  routineCount: number;
  archiveCount: number;
}

export default function Navbar({ 
  currentUser, 
  onOpenAuth, 
  onViewChange, 
  currentView,
  liveCount,
  routineCount,
  archiveCount
}: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 flex-shrink-0">
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
              <span className="text-lg font-bold tracking-tight text-slate-800">
                কুইজ মাস্টার <span className="text-blue-600">প্রো</span>
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
                  ? "bg-blue-50 text-blue-600 font-bold border border-blue-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
                  ? "bg-emerald-50 text-emerald-600 font-bold border border-emerald-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
                  ? "bg-blue-50 text-blue-600 font-bold border border-blue-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
                  ? "bg-slate-100 text-slate-700 font-bold border border-slate-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
                  ? "bg-indigo-50 text-indigo-600 font-bold border border-indigo-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>লিডারবোর্ড</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 mx-1 shrink-0" />

            {/* Auth section */}
            {currentUser ? (
              <button
                id="btn-profile"
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-full transition-all cursor-pointer shrink-0"
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
                className="flex items-center gap-1.5 py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-full shadow-sm transition-colors cursor-pointer shrink-0"
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
