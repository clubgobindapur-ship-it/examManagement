import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { 
  Bell, Plus, Trash2, Edit3, Save, Users, User, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff, Search 
} from "lucide-react";

interface Notice {
  id: string;
  noticeText: string;
  user: string; // "all" or specific userId
  isLive: boolean;
  deeplink: string;
  createdAt: string;
}

export default function AdminNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingId, setEditingId] = useState("");
  const [formText, setFormText] = useState("");
  const [targetType, setTargetType] = useState<"all" | "user">("all");
  const [formUserId, setFormUserId] = useState("");
  const [formDeeplink, setFormDeeplink] = useState("");
  const [formIsLive, setFormIsLive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(collection(db, "notices"));
      const list: Notice[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          noticeText: data.noticeText || "",
          user: data.user || "all",
          isLive: data.isLive !== undefined ? data.isLive : true,
          deeplink: data.deeplink || "",
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotices(list);
    } catch (err: any) {
      console.error(err);
      setError("নোটিশ লোড করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleOpenAdd = () => {
    setFormText("");
    setTargetType("all");
    setFormUserId("");
    setFormDeeplink("");
    setFormIsLive(true);
    setMode("add");
    setError("");
    setSuccess("");
  };

  const handleOpenEdit = (notice: Notice) => {
    setEditingId(notice.id);
    setFormText(notice.noticeText);
    if (notice.user === "all") {
      setTargetType("all");
      setFormUserId("");
    } else {
      setTargetType("user");
      setFormUserId(notice.user);
    }
    setFormDeeplink(notice.deeplink);
    setFormIsLive(notice.isLive);
    setMode("edit");
    setError("");
    setSuccess("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formText.trim()) {
      setError("নোটিশের টেক্সট অবশ্যই দিতে হবে।");
      return;
    }

    if (targetType === "user" && !formUserId.trim()) {
      setError("নির্দিষ্ট ইউজারের নোটিশের ক্ষেত্রে ইউজার আইডি অবশ্যই দিতে হবে।");
      return;
    }

    setIsSaving(true);
    const targetUser = targetType === "all" ? "all" : formUserId.trim();
    const finalNoticeId = mode === "edit" ? editingId : doc(collection(db, "notices")).id;

    const payload = {
      noticeText: formText.trim(),
      user: targetUser,
      isLive: formIsLive,
      deeplink: formDeeplink.trim(),
      createdAt: mode === "edit" 
        ? (notices.find(n => n.id === editingId)?.createdAt || new Date().toISOString()) 
        : new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "notices", finalNoticeId), payload, { merge: true });
      setSuccess(mode === "add" ? "নতুন নোটিশ সফলভাবে তৈরি করা হয়েছে!" : "নোটিশ সফলভাবে আপডেট করা হয়েছে!");
      trackEvent(`admin_notice_${mode}_success`, { noticeId: finalNoticeId });
      await fetchNotices();
      setMode("list");
    } catch (err: any) {
      console.error(err);
      setError("নোটিশ সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
      trackEvent(`admin_notice_${mode}_failure`, { error: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (notice: Notice) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে এই নোটিশটি মুছে ফেলতে চান?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await deleteDoc(doc(db, "notices", notice.id));
      setSuccess("নোটিশটি সফলভাবে মুছে ফেলা হয়েছে।");
      trackEvent("admin_notice_delete_success", { noticeId: notice.id });
      await fetchNotices();
    } catch (err: any) {
      console.error(err);
      setError("নোটিশ মুছে ফেলতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const filteredNotices = notices.filter(n => {
    const query = searchQuery.toLowerCase();
    return (
      n.noticeText.toLowerCase().includes(query) ||
      n.user.toLowerCase().includes(query) ||
      n.deeplink.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            <span>নোটিশ ম্যানেজমেন্ট (Notice Board)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">সব ইউজার অথবা নির্দিষ্ট ইউজারের জন্য নোটিশ কনফিগার ও পরিচালনা করুন।</p>
        </div>

        {mode === "list" ? (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন নোটিশ যোগ করুন</span>
          </button>
        ) : (
          <button
            onClick={() => setMode("list")}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            তালিকায় ফিরে যান
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-start gap-3 text-emerald-700 dark:text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {mode === "list" ? (
        <div className="space-y-4">
          {/* Search bar & Refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="নোটিশ অনুসন্ধান করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchNotices}
              disabled={loading}
              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-450 dark:text-slate-500 font-bold">নোটিশ তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl max-w-md mx-auto">
              <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">কোনো নোটিশ খুঁজে পাওয়া যায়নি।</p>
              <p className="text-[12px] text-slate-400 mt-1">নতুন একটি নোটিশ তৈরি করতে ওপরের বাটনটি ক্লিক করুন।</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredNotices.map((notice) => (
                <div 
                  key={notice.id} 
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    notice.isLive 
                      ? "bg-indigo-50/10 dark:bg-slate-850/20 border-slate-200/80 dark:border-slate-800" 
                      : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-850 opacity-60"
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                        notice.user === "all"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400"
                      }`}>
                        {notice.user === "all" ? (
                          <>
                            <Users className="w-2.5 h-2.5" />
                            <span>সব ইউজার</span>
                          </>
                        ) : (
                          <>
                            <User className="w-2.5 h-2.5" />
                            <span>ইউজার ID: {notice.user}</span>
                          </>
                        )}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${
                        notice.isLive
                          ? "bg-emerald-150 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-450"
                      }`}>
                        {notice.isLive ? (
                          <>
                            <Eye className="w-2.5 h-2.5" />
                            <span>লাইভ</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>অদৃশ্য</span>
                          </>
                        )}
                      </span>

                      {notice.deeplink && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 rounded-md text-[11px] font-bold">
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>লিঙ্ক: {notice.deeplink}</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-mono ml-auto md:ml-0">
                        {new Date(notice.createdAt).toLocaleString("bn-BD")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                      {notice.noticeText}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => handleOpenEdit(notice)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 rounded-lg transition-all cursor-pointer"
                      title="Edit Notice"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notice)}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Add/Edit Form */
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-xs text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">নোটিশের বিবরণ নির্দেশিকা</span>
            <p>• <b>সব ইউজার (All)</b>: এই নোটিশটি পোর্টালে আসা সকল শিক্ষার্থী দেখতে পারবেন।</p>
            <p>• <b>নির্দিষ্ট ইউজার (Particular User)</b>: শুধুমাত্র সেই ইউজারের প্রোফাইলে নোটিশটি প্রদর্শিত হবে (যেমন ভেরিফিকেশন কনফার্মেশন)।</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Target Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block">কাকে পাঠাবেন? (Target Audience)</label>
              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "all"}
                    onChange={() => setTargetType("all")}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>সকল ইউজার (All Users)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "user"}
                    onChange={() => setTargetType("user")}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>নির্দিষ্ট ইউজার (Particular User)</span>
                </label>
              </div>
            </div>

            {/* User ID Field (visible only for specific user target) */}
            {targetType === "user" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block">ইউজার আইডি (User ID) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: FgXm4Y9vT1s2p..."
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Deep link selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block">ডিপ লিঙ্ক / গন্তব্য পেজ (Deeplink - Click Action)</label>
              <select
                value={formDeeplink}
                onChange={(e) => setFormDeeplink(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
              >
                <option value="">কোনটিই নয় (None - Just view Notice)</option>
                <option value="live">চলতি পরীক্ষা (Live Exams Section)</option>
                <option value="routine">পরীক্ষার রুটিন (Routine Section)</option>
                <option value="leaderboard">মেধা তালিকা (Leaderboard Section)</option>
                <option value="pricing">প্রিমিয়াম প্যাকেজ কিনুন (Pricing/Premium Section)</option>
                <option value="archive">আর্কাইভড পরীক্ষা (Archive Section)</option>
              </select>
            </div>

            {/* Custom deep link option or text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block">কাস্টম ডিপ লিঙ্ক (ঐচ্ছিক)</label>
              <input
                type="text"
                placeholder="যেমন: live, pricing, custom-route"
                value={formDeeplink}
                onChange={(e) => setFormDeeplink(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notice Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-755 dark:text-slate-300 block">নোটিশের বিষয়বস্তু (Notice Text) <span className="text-rose-500">*</span></label>
            <textarea
              required
              rows={4}
              placeholder="নোটিশের বিস্তারিত বাংলা বা ইংরেজিতে লিখুন..."
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Live Checkbox */}
          <div className="py-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsLive}
                onChange={(e) => setFormIsLive(e.target.checked)}
                className="w-4.5 h-4.5 text-blue-600 border-slate-300 dark:border-slate-700 rounded-md focus:ring-blue-500"
              />
              <div>
                <span className="text-xs font-extrabold text-slate-850 dark:text-slate-200 block">এই নোটিশটি সরাসরি লাইভ করুন (Notice Is Live)</span>
                <span className="text-[12px] text-slate-400 block">চেক করা থাকলে ইউজাররা সাথে সাথে এটি নোটিফিকেশন লিস্টে দেখতে পারবেন।</span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMode("list")}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              বাতিল করুন
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "সংরক্ষণ করা হচ্ছে..." : "নোটিশ সংরক্ষণ করুন"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
