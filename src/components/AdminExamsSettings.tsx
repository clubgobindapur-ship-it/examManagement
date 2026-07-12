import React, { useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { 
  Save, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  HelpCircle, 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Hash, 
  Clock, 
  Calendar,
  AlertTriangle
} from "lucide-react";

interface Exam {
  id: string;
  slNo: number;
  name: string;
  tabName: string;
  timeLimit: number;
  status: string;
  examDate?: string;
  markPerQuestion?: number;
  penaltyMark?: number;
  isFree?: boolean;
  price?: number;
  questionCount?: number;
  showResult?: boolean;
  passPercentage?: number;
  minPassMark?: number;
}

interface AdminExamsSettingsProps {
  exams: Exam[];
  onReload: () => Promise<void>;
}

export default function AdminExamsSettings({ exams, onReload }: AdminExamsSettingsProps) {
  const [examList, setExamList] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Mode states: "list" | "add" | "edit"
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  
  // Active exam being edited
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Form states
  const [formId, setFormId] = useState("");
  const [formSlNo, setFormSlNo] = useState<number>(1);
  const [formName, setFormName] = useState("");
  const [formTabName, setFormTabName] = useState("");
  const [formTimeLimit, setFormTimeLimit] = useState<number>(15);
  const [formQuestionCount, setFormQuestionCount] = useState<number>(10);
  const [formStatus, setFormStatus] = useState("draft");
  const [formExamDate, setFormExamDate] = useState("");
  const [formMarkPerQuestion, setFormMarkPerQuestion] = useState<number>(1);
  const [formPenaltyMark, setFormPenaltyMark] = useState<number>(0.25);
  const [formIsFree, setFormIsFree] = useState(true);
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formShowResult, setFormShowResult] = useState<boolean>(false);
  const [formPassPercentage, setFormPassPercentage] = useState<number>(40);
  const [formMinPassMark, setFormMinPassMark] = useState<number>(0);

  // Custom confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<Exam | null>(null);

  // Load from firestore
  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(collection(db, "examList"));
      const list: Exam[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          slNo: Number(data.slNo) || 1,
          name: String(data.name || ""),
          tabName: String(data.tabName || ""),
          timeLimit: Number(data.timeLimit) || 15,
          status: String(data.status || "draft"),
          examDate: data.examDate ? String(data.examDate) : undefined,
          markPerQuestion: data.markPerQuestion !== undefined ? Number(data.markPerQuestion) : 1,
          penaltyMark: data.penaltyMark !== undefined ? Number(data.penaltyMark) : 0.25,
          questionCount: data.questionCount !== undefined ? Number(data.questionCount) : undefined,
          isFree: data.isFree !== undefined ? Boolean(data.isFree) : true,
          price: data.price !== undefined ? Number(data.price) : 0,
          showResult: data.showResult !== undefined ? Boolean(data.showResult) : false,
          passPercentage: data.passPercentage !== undefined ? Number(data.passPercentage) : 40,
          minPassMark: data.minPassMark !== undefined ? Number(data.minPassMark) : 0
        });
      });
      list.sort((a, b) => a.slNo - b.slNo);
      setExamList(list);
    } catch (err: any) {
      console.error("Error fetching exams:", err);
      setError("পরীক্ষার তালিকা লোড করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [exams]);

  const resetForm = () => {
    setFormId("");
    // Default slNo to next available
    const nextSl = examList.length > 0 ? Math.max(...examList.map(e => e.slNo)) + 1 : 1;
    setFormSlNo(nextSl);
    setFormName("");
    setFormTabName("");
    setFormTimeLimit(15);
    setFormQuestionCount(10);
    setFormStatus("draft");
    setFormExamDate("");
    setFormMarkPerQuestion(1);
    setFormPenaltyMark(0.25);
    setFormIsFree(true);
    setFormPrice(0);
    setFormShowResult(false);
    setFormPassPercentage(40);
    setFormMinPassMark(0);
    setSelectedExam(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setMode("add");
    setSuccess("");
    setError("");
  };

  const handleOpenEdit = (exam: Exam) => {
    setSelectedExam(exam);
    setFormId(exam.id);
    setFormSlNo(exam.slNo);
    setFormName(exam.name);
    setFormTabName(exam.tabName);
    setFormTimeLimit(exam.timeLimit);
    setFormQuestionCount(exam.questionCount !== undefined ? exam.questionCount : 10);
    setFormStatus(exam.status);
    setFormExamDate(exam.examDate || "");
    setFormMarkPerQuestion(exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1);
    setFormPenaltyMark(exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25);
    setFormIsFree(exam.isFree !== undefined ? exam.isFree : true);
    setFormPrice(exam.price || 0);
    setFormShowResult(exam.showResult !== undefined ? exam.showResult : false);
    setFormPassPercentage(exam.passPercentage !== undefined ? exam.passPercentage : 40);
    setFormMinPassMark(exam.minPassMark !== undefined ? exam.minPassMark : 0);
    setMode("edit");
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    // Create unique ID from name if empty
    let finalId = formId.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (!finalId) {
      finalId = formName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
    }

    if (!finalId) {
      setError("দয়া করে একটি সঠিক পরীক্ষার আইডি লিখুন বা পরীক্ষার নাম দিন।");
      setSubmitting(false);
      return;
    }

    if (!formTabName.trim()) {
      setError("গুগল শিটের ট্যাব নাম (Tab Name) আবশ্যিক।");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        id: finalId,
        slNo: Number(formSlNo),
        name: formName.trim(),
        tabName: formTabName.trim(),
        timeLimit: Number(formTimeLimit),
        questionCount: Number(formQuestionCount),
        status: formStatus,
        examDate: formExamDate.trim() || null,
        markPerQuestion: Number(formMarkPerQuestion),
        penaltyMark: Number(formPenaltyMark),
        isFree: Boolean(formIsFree),
        price: formIsFree ? 0 : Number(formPrice),
        showResult: Boolean(formShowResult),
        passPercentage: Number(formPassPercentage),
        minPassMark: Number(formMinPassMark),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "examList", finalId), payload, { merge: true });
      
      setSuccess(mode === "add" ? "নতুন পরীক্ষা সফলভাবে তৈরি করা হয়েছে!" : "পরীক্ষার তথ্য সফলভাবে আপডেট করা হয়েছে!");
      trackEvent(`admin_exam_${mode}_success`, { examId: finalId });

      await onReload();
      await fetchExams();
      setMode("list");
    } catch (err: any) {
      console.error(err);
      setError("সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await deleteDoc(doc(db, "examList", exam.id));
      setSuccess(`"${exam.name}" পরীক্ষাটি সফলভাবে মুছে ফেলা হয়েছে।`);
      trackEvent("admin_exam_delete_success", { examId: exam.id });
      await onReload();
      await fetchExams();
    } catch (err: any) {
      console.error(err);
      setError("মুছে ফেলতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setSubmitting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden font-sans transition-colors">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-900 text-white p-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans flex items-center gap-2">
            <span>Exam Management (পরীক্ষা ব্যবস্থাপনা)</span>
          </h2>
          <p className="text-xs text-indigo-100 mt-1">
            অ্যাডমিন প্যানেল থেকে সরাসরি পরীক্ষা তৈরি, পরিবর্তন, ফ্রি/পেইড সেটিংস এবং ডিলিট করার ব্যবস্থা।
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন পরীক্ষা যোগ করুন</span>
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex gap-2.5 items-start dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex gap-2.5 items-start dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* LIST VIEW */}
        {mode === "list" && (
          loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto text-indigo-600" />
              <p className="text-sm text-slate-400 font-semibold">পরীক্ষার তালিকা লোড হচ্ছে...</p>
            </div>
          ) : examList.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">কোনো পরীক্ষা পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                কোনো পরীক্ষা এখনো ফায়ারস্টোরে তৈরি করা হয়নি। আপনি "নতুন পরীক্ষা যোগ করুন" বাটনে ক্লিক করে পরীক্ষা শুরু করতে পারেন।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-150 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold text-center w-12">ক্র.</th>
                    <th className="py-3 px-4 font-bold">পরীক্ষার নাম (Exam Name)</th>
                    <th className="py-3 px-4 font-bold">ট্যাব (Tab Name)</th>
                    <th className="py-3 px-4 font-bold">সময় (Time)</th>
                    <th className="py-3 px-4 font-bold">মার্কিং ও পেনাল্টি</th>
                    <th className="py-3 px-4 font-bold">টাইপ (Type)</th>
                    <th className="py-3 px-4 font-bold">রেজাল্ট</th>
                    <th className="py-3 px-4 font-bold">স্ট্যাটাস</th>
                    <th className="py-3 px-4 font-bold text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {examList.map((exam, idx) => (
                    <tr 
                      key={exam.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-xs"
                    >
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {exam.slNo}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{exam.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>ID: {exam.id}</span>
                          {exam.questionCount !== undefined && exam.questionCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">প্রশ্নের সংখ্যা: {exam.questionCount}টি</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-400 font-medium">
                        {exam.tabName}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                        {exam.timeLimit} মিনিট
                        {exam.examDate && (
                          <div className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{exam.examDate}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        <div>সঠিক: <span className="font-bold text-slate-700 dark:text-slate-300">+{exam.markPerQuestion}</span></div>
                        <div>ভুল: <span className="font-bold text-rose-600">-{exam.penaltyMark}</span></div>
                      </td>
                      <td className="py-4 px-4">
                        {exam.isFree ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg text-[10px]">
                            <Unlock className="w-3 h-3 text-emerald-500" />
                            <span>ফ্রি</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-[10px]">
                            <Lock className="w-3 h-3 text-amber-500" />
                            <span>{exam.price} ৳</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {exam.showResult ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold rounded-lg text-[10px]" title={`Pass percentage: ${exam.passPercentage || 40}%`}>
                              প্রকাশিত ({exam.passPercentage || 40}%)
                            </span>
                            {exam.minPassMark !== undefined && exam.minPassMark > 0 && (
                              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                                ন্যূনতম: {exam.minPassMark}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-450 font-bold rounded-lg text-[10px]">
                            অপ্রকাশিত
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-1 rounded-lg text-[10px] uppercase font-extrabold ${
                          exam.status === "live"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : exam.status === "archived" || exam.status === "archive"
                            ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                        }`}>
                          {exam.status === "live" ? "লাইভ" : exam.status === "archived" || exam.status === "archive" ? "আর্কাইভ" : "ড্রাফট"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(exam)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(exam)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ADD OR EDIT MODE */}
        {(mode === "add" || mode === "edit") && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                {mode === "add" ? "নতুন পরীক্ষার তথ্য" : "পরীক্ষার তথ্য সংশোধন"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Exam ID */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    পরীক্ষার আইডি (Exam ID - Unique Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={mode === "edit"}
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="যেমন: chemistry-midterm (ইংরেজি ছোট হাতের অক্ষর ও হাইফেন)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold disabled:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                  />
                </div>

                {/* Serial No */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    ক্রমিক নম্বর (Serial No / SL No) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formSlNo}
                    onChange={(e) => setFormSlNo(Number(e.target.value))}
                    placeholder="যেমন: 4"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    পরীক্ষার নাম (Exam Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="যেমন: BCS Preliminary Exam (বাংলা বা ইংরেজি)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Tab Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    গুগল শিটের ট্যাব নাম (Tab Name in Google Sheets) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTabName}
                    onChange={(e) => setFormTabName(e.target.value)}
                    placeholder="যেমন: BCS_Questions"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Time Limit */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    সময়সীমা (Time Limit in Minutes) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                    placeholder="যেমন: 15"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Number of Questions */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    প্রশ্নের সংখ্যা (Number of Questions) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formQuestionCount}
                    onChange={(e) => setFormQuestionCount(Number(e.target.value))}
                    placeholder="যেমন: 10"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Exam Date */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    পরীক্ষার তারিখ (Exam Date - Optional)
                  </label>
                  <input
                    type="text"
                    value={formExamDate}
                    onChange={(e) => setFormExamDate(e.target.value)}
                    placeholder="যেমন: 08/15/26 (বা যেকোনো টেক্সট)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    পরীক্ষার স্ট্যাটাস (Status)
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  >
                    <option value="draft">Draft (ড্রাফট)</option>
                    <option value="live">Live (লাইভ)</option>
                    <option value="archived">Archived (আর্কাইভ)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Score & Pricing Configuration */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                মার্কিং ও প্রাইসিং কনফিগারেশন
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mark per question */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    প্রতিটি সঠিক উত্তরের মান (Mark per Question) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={formMarkPerQuestion}
                    onChange={(e) => setFormMarkPerQuestion(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Penalty mark */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    ভুল উত্তরের জন্য পেনাল্টি মার্ক (Negative/Penalty Mark) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPenaltyMark}
                    onChange={(e) => setFormPenaltyMark(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                </div>

                {/* Free Toggle */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    অ্যাক্সেস মোড (Access Mode)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormIsFree(!formIsFree);
                      if (!formIsFree) {
                        setFormPrice(0);
                      }
                    }}
                    className={`w-full py-2.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer transition-all ${
                      formIsFree
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {formIsFree ? (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span>Free (সম্পূর্ণ ফ্রি পরীক্ষা)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span>Paid (প্রিমিয়াম/পেইড পরীক্ষা)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    পরীক্ষার মূল্য (Price BDT)
                  </label>
                  <input
                    type="number"
                    disabled={formIsFree}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    placeholder="যেমন: 50"
                    className={`w-full px-4 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formIsFree
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-750 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  />
                </div>

                {/* Publish Result Toggle */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    রেজাল্ট পাবলিশ স্ট্যাটাস (Result Status)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormShowResult(!formShowResult)}
                    className={`w-full py-2.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer transition-all ${
                      formShowResult
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400"
                        : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    <span>{formShowResult ? "✓ রেজাল্ট প্রকাশিত (Published)" : "✗ রেজাল্ট অপ্রকাশিত (Hidden)"}</span>
                  </button>
                </div>

                {/* Pass Percentage */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    উত্তীর্ণ শিক্ষার্থীর হার (Pass Percentage: Top x%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formPassPercentage}
                    onChange={(e) => setFormPassPercentage(Number(e.target.value))}
                    placeholder="যেমন: 40"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    প্রাপ্ত নম্বরের ওপর ভিত্তি করে মেধা তালিকার শীর্ষে থাকা শতকরা {formPassPercentage}% শিক্ষার্থী উত্তীর্ণ (Pass) হবে।
                  </p>
                </div>

                {/* Minimum Pass Mark */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[10px]">
                    ন্যূনতম পাস নম্বর (Minimum Pass Mark)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formMinPassMark}
                    onChange={(e) => setFormMinPassMark(Number(e.target.value))}
                    placeholder="যেমন: 20"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    পরীক্ষার্থীকে অবশ্যই ন্যূনতম এই নম্বরটি পেতে হবে এবং একই সাথে শীর্ষ মেধা তালিকায় থাকতে হবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Form Action buttons */}
            <div className="flex gap-4 justify-end pt-2">
              <button
                type="button"
                onClick={() => setMode("list")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>সংরক্ষণ করুন</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-150 dark:border-slate-800 text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                পরীক্ষাটি মুছে ফেলতে চান?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                আপনি কি নিশ্চিত যে <strong>"{deleteConfirm.name}"</strong> পরীক্ষাটি মুছে ফেলতে চান? এই অ্যাকশনটি পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>হ্যাঁ, মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
