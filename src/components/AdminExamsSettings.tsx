import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { Save, ShieldAlert, CheckCircle2, Lock, Unlock, HelpCircle, Loader2 } from "lucide-react";

interface Exam {
  id: string;
  slNo: number;
  name: string;
  tabName: string;
  timeLimit: number;
  status: string;
  markPerQuestion?: number;
  penaltyMark?: number;
  isFree?: boolean;
  price?: number;
}

interface AdminExamsSettingsProps {
  exams: Exam[];
  onReload: () => Promise<void>;
}

export default function AdminExamsSettings({ exams, onReload }: AdminExamsSettingsProps) {
  const [examConfigs, setExamConfigs] = useState<{ [examId: string]: Exam }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form states
  const [markPerQ, setMarkPerQ] = useState<{ [examId: string]: number }>({});
  const [penaltyM, setPenaltyM] = useState<{ [examId: string]: number }>({});
  const [isFree, setIsFree] = useState<{ [examId: string]: boolean }>({});
  const [price, setPrice] = useState<{ [examId: string]: number }>({});

  const loadExamConfigsFromFirestore = async () => {
    setLoading(true);
    setError("");
    trackEvent("admin_load_exams_settings_start");
    try {
      const snap = await getDocs(collection(db, "exams"));
      const configs: { [examId: string]: any } = {};
      snap.forEach((docSnap) => {
        configs[docSnap.id] = docSnap.data();
      });

      setExamConfigs(configs);

      // Initialize form states
      const marksInit: { [examId: string]: number } = {};
      const penaltyInit: { [examId: string]: number } = {};
      const freeInit: { [examId: string]: boolean } = {};
      const priceInit: { [examId: string]: number } = {};

      exams.forEach((exam) => {
        const custom = configs[exam.id] || {};
        marksInit[exam.id] = custom.markPerQuestion !== undefined ? Number(custom.markPerQuestion) : 1;
        penaltyInit[exam.id] = custom.penaltyMark !== undefined ? Number(custom.penaltyMark) : 0.25;
        freeInit[exam.id] = custom.isFree !== undefined ? Boolean(custom.isFree) : true;
        priceInit[exam.id] = custom.price !== undefined ? Number(custom.price) : 0;
      });

      setMarkPerQ(marksInit);
      setPenaltyM(penaltyInit);
      setIsFree(freeInit);
      setPrice(priceInit);

      trackEvent("admin_load_exams_settings_success", { count: snap.size });
    } catch (err: any) {
      console.error(err);
      setError("ফায়ারস্টোর থেকে পরীক্ষার কনফিগারেশন লোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamConfigsFromFirestore();
  }, [exams]);

  const handleSaveConfig = async (exam: Exam) => {
    setSavingId(exam.id);
    setError("");
    setSuccess("");
    trackEvent("admin_save_exam_config_start", { examId: exam.id });

    try {
      const mVal = Number(markPerQ[exam.id] || 1);
      const pVal = Number(penaltyM[exam.id] || 0.25);
      const freeVal = isFree[exam.id] !== undefined ? isFree[exam.id] : true;
      const priceVal = Number(price[exam.id] || 0);

      const examDocRef = doc(db, "exams", exam.id);
      const payload = {
        id: exam.id,
        slNo: exam.slNo,
        name: exam.name,
        tabName: exam.tabName,
        timeLimit: exam.timeLimit,
        status: exam.status,
        markPerQuestion: mVal,
        penaltyMark: pVal,
        isFree: freeVal,
        price: freeVal ? 0 : priceVal,
        updatedAt: new Date().toISOString()
      };

      await setDoc(examDocRef, payload, { merge: true });

      setSuccess(`"${exam.name}" পরীক্ষার সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!`);
      trackEvent("admin_save_exam_config_success", { examId: exam.id, markPerQuestion: mVal, penaltyMark: pVal });

      // Refresh list
      await onReload();
      await loadExamConfigsFromFirestore();
    } catch (err: any) {
      console.error(err);
      setError("পরীক্ষার সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
      trackEvent("admin_save_exam_config_failure", { error: err.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-blue-800 to-sky-900 text-white p-6">
        <h2 className="text-xl font-bold font-sans flex items-center gap-2">
          <span>Exam Pricing & Score Configuration</span>
        </h2>
        <p className="text-xs text-sky-100 mt-1">
          প্রতিটি পরীক্ষার জন্য আলাদা সঠিক উত্তর মান, ভুল উত্তর পেনাল্টি, ফ্রি/পেইড স্ট্যাটাস এবং সাবস্ক্রিপশন মূল্য নির্ধারণ করুন।
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-slate-400 font-semibold">পরীক্ষার কনফিগারেশন লোড হচ্ছে...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 mt-2">কোনো পরীক্ষা পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              দয়া করে নিশ্চিত হোন যে আপনার স্প্রেডশিট বা গুগল অ্যাপস স্ক্রিপ্ট সঠিকভাবে কানেক্টেড আছে।
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {exams.map((exam) => {
              const config = examConfigs[exam.id] || {};
              const currentFree = isFree[exam.id] !== undefined ? isFree[exam.id] : true;

              return (
                <div
                  key={exam.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all text-xs hover:border-slate-300"
                >
                  {/* Left Column: Exam Identity */}
                  <div className="space-y-2 max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] font-sans">
                        {exam.slNo}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{exam.name}</h4>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-1 font-mono">
                      <div>Tab Name: <span className="font-bold text-slate-600">{exam.tabName}</span></div>
                      <div>Time Limit: <span className="font-bold text-slate-600">{exam.timeLimit} mins</span></div>
                      <div className="flex items-center gap-1.5 mt-1">
                        Status:{" "}
                        <span className={`px-1.5 py-0.5 rounded font-sans text-[8px] uppercase tracking-wider font-extrabold ${
                          exam.status === "live"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {exam.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Dynamic Config Form fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                    {/* Mark Per Q */}
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold tracking-wide block text-[10px]">সঠিক উত্তর মান (Marks)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={markPerQ[exam.id] !== undefined ? markPerQ[exam.id] : 1}
                        onChange={(e) => setMarkPerQ({ ...markPerQ, [exam.id]: Number(e.target.value) })}
                        placeholder="1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-bold"
                      />
                    </div>

                    {/* Penalty Mark */}
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold tracking-wide block text-[10px]">ভুল পেনাল্টি (Penalty)</label>
                      <input
                        type="number"
                        step="0.05"
                        required
                        value={penaltyM[exam.id] !== undefined ? penaltyM[exam.id] : 0.25}
                        onChange={(e) => setPenaltyM({ ...penaltyM, [exam.id]: Number(e.target.value) })}
                        placeholder="0.25"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs font-bold"
                      />
                    </div>

                    {/* Free/Paid selection toggle */}
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold tracking-wide block text-[10px]">অ্যাক্সেস টাইপ (Access)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const toggled = !currentFree;
                          setIsFree({ ...isFree, [exam.id]: toggled });
                          if (toggled) {
                            setPrice({ ...price, [exam.id]: 0 });
                          }
                        }}
                        className={`w-full py-2 px-3 border rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer transition-all ${
                          currentFree
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        {currentFree ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span>Free (ফ্রি)</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span>Paid (পেইড)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Price (Visible only if paid) */}
                    <div className="space-y-1">
                      <label className="text-slate-500 font-bold tracking-wide block text-[10px]">পরীক্ষার মূল্য (Price BDT)</label>
                      <input
                        type="number"
                        disabled={currentFree}
                        value={price[exam.id] !== undefined ? price[exam.id] : 0}
                        onChange={(e) => setPrice({ ...price, [exam.id]: Number(e.target.value) })}
                        placeholder="0"
                        className={`w-full px-3 py-2 border rounded-xl font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          currentFree
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Actions Column: Save Button */}
                  <div className="flex md:items-center shrink-0">
                    <button
                      onClick={() => handleSaveConfig(exam)}
                      disabled={savingId === exam.id}
                      className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      {savingId === exam.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{savingId === exam.id ? "সংরক্ষণ..." : "সংরক্ষণ করুন"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
