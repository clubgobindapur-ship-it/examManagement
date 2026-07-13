import React, { useState, useMemo } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Attempt, formatExamDate } from "../types";
import { Award, CheckCircle2, XCircle, HelpCircle, TrendingUp, Lock, Sparkles, BarChart2 } from "lucide-react";
import { trackEvent } from "../lib/analytics";

interface UserPerformanceChartProps {
  attempts: Attempt[];
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  theme?: "light" | "dark";
}

const formatGraphDate = (isoString: string) => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[date.getMonth()]}`;
  } catch {
    return "";
  }
};

export default function UserPerformanceChart({ attempts, onOpenAuth, isLoggedIn, theme }: UserPerformanceChartProps) {
  const isDark = theme === "dark";
  const [metric, setMetric] = useState<"percentage" | "correct" | "wrong" | "skipped" | "obtainedMark">("percentage");

  const handleMetricChange = (newMetric: typeof metric) => {
    setMetric(newMetric);
    trackEvent("tracker_filter", { metric: newMetric });
  };

  // Format data for chart on the fly to support older schemas
  const chartData = useMemo(() => {
    return attempts.map((attempt) => {
      const correct = attempt.correctCount !== undefined ? attempt.correctCount : attempt.score;
      const total = attempt.totalQuestions || 10;
      const pct = attempt.percentage !== undefined ? attempt.percentage : Math.round((correct / total) * 100);
      const skipped = attempt.skippedCount !== undefined ? attempt.skippedCount : 0;
      const wrong = attempt.wrongCount !== undefined ? attempt.wrongCount : Math.max(0, total - correct - skipped);
      const obtainedMark = attempt.totalObtainedMark !== undefined ? attempt.totalObtainedMark : (attempt.score || 0);

      return {
        date: formatGraphDate(attempt.completedAt),
        fullDate: formatExamDate(attempt.completedAt),
        examName: attempt.examName,
        percentage: pct,
        correct: correct,
        wrong: wrong,
        skipped: skipped,
        total: total,
        obtainedMark: obtainedMark,
      };
    });
  }, [attempts]);

  // General summary metrics
  const summary = useMemo(() => {
    if (attempts.length === 0) return { total: 0, avgPct: 0, bestPct: 0 };
    let totalPct = 0;
    let bestPct = 0;

    attempts.forEach((att) => {
      const correct = att.correctCount !== undefined ? att.correctCount : att.score;
      const total = att.totalQuestions || 10;
      const pct = att.percentage !== undefined ? att.percentage : Math.round((correct / total) * 100);
      totalPct += pct;
      if (pct > bestPct) {
        bestPct = pct;
      }
    });

    return {
      total: attempts.length,
      avgPct: Math.round(totalPct / attempts.length),
      bestPct,
    };
  }, [attempts]);

  // Color config based on active metric
  const colorConfig = useMemo(() => {
    switch (metric) {
      case "correct":
        return {
          stroke: "#10b981", // emerald-500
          fill: "url(#colorCorrect)",
          label: "সঠিক উত্তর (Correct)",
          unit: "টি",
        };
      case "wrong":
        return {
          stroke: "#f43f5e", // rose-500
          fill: "url(#colorWrong)",
          label: "ভুল উত্তর (Wrong)",
          unit: "টি",
        };
      case "skipped":
        return {
          stroke: "#f59e0b", // amber-500
          fill: "url(#colorSkipped)",
          label: "এড়িয়ে যাওয়া (Skipped)",
          unit: "টি",
        };
      case "obtainedMark":
        return {
          stroke: "#8b5cf6", // purple-500
          fill: "url(#colorObtained)",
          label: "প্রাপ্ত নম্বর (Obtained Mark)",
          unit: " নম্বর",
        };
      case "percentage":
      default:
        return {
          stroke: "#3b82f6", // blue-500
          fill: "url(#colorPct)",
          label: "শতকরা হার (Percentage)",
          unit: "%",
        };
    }
  }, [metric]);

  if (!isLoggedIn) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">অগ্রগতি ট্র্যাকার (Progress Tracker)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            আপনার কর্মদক্ষতার গ্রাফ ও অগ্রগতির বিস্তারিত বিশ্লেষণ দেখতে দয়া করে লগ ইন করুন। লগ ইন করার পর আপনি প্রতিটি পরীক্ষার ফলাফল ট্র্যাকিং করতে পারবেন।
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>লগ ইন / সাইন আপ করুন</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-850/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">কর্মদক্ষতা গ্রাফ (Your Performance Analytics)</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">পরীক্ষাসমূহে আপনার অর্জিত ফলাফল ও অগ্রগতির তুলনামূলক বিশ্লেষণ।</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
          <button
            onClick={() => handleMetricChange("percentage")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metric === "percentage"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            শতকরা হার (%)
          </button>
          <button
            onClick={() => handleMetricChange("obtainedMark")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metric === "obtainedMark"
                ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            প্রাপ্ত নম্বর
          </button>
          <button
            onClick={() => handleMetricChange("correct")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metric === "correct"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            সঠিক
          </button>
          <button
            onClick={() => handleMetricChange("wrong")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metric === "wrong"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            ভুল
          </button>
          <button
            onClick={() => handleMetricChange("skipped")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metric === "skipped"
                ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            বাদ দেওয়া
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-slate-100 dark:border-slate-800">
        {/* Quick Stats boxes */}
        <div className="p-6 bg-slate-50/20 dark:bg-slate-900/20 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col justify-center space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-750 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block">মোট পরীক্ষা</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-800 dark:text-white">{summary.total}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">টি</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-750 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block">গড় স্কোর (Avg)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{summary.avgPct}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-750 shadow-xs">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider block">সর্বোচ্চ স্কোর (Max)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.bestPct}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="p-6 lg:col-span-3 min-h-[300px]">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 min-h-[250px]">
              <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-700 animate-pulse" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">কোনো পরীক্ষার তথ্য পাওয়া যায়নি।</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">পরীক্ষায় অংশ নেওয়া শুরু করলে এখানে আপনার কর্মদক্ষতা চার্ট যুক্ত হবে।</p>
            </div>
          ) : (
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorObtained" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWrong" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSkipped" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={metric === "percentage" ? [0, 100] : ["auto", "auto"]}
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs space-y-2 font-sans">
                            <p className="font-extrabold text-slate-100">{data.examName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{data.fullDate}</p>
                            <div className="h-px bg-slate-800 my-1.5" />
                            <div className="space-y-1 font-semibold">
                              <p className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>শতকরা নম্বর: {data.percentage}%</span>
                              </p>
                              {data.obtainedMark !== undefined && (
                                <p className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                                  <span>প্রাপ্ত নম্বর: {data.obtainedMark}</span>
                                </p>
                              )}
                              <p className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>সঠিক: {data.correct} টি</span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>ভুল: {data.wrong} টি</span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>বাদ দেওয়া: {data.skipped} টি</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={colorConfig.stroke}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={colorConfig.fill}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
