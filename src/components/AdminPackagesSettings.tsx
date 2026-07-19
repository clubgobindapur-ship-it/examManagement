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
  DollarSign,
  Tag,
  Eye,
  PlusCircle,
  Sparkles
} from "lucide-react";

interface Package {
  id: string;
  packageId: string;
  packagetype: string;
  packageTitle: string;
  packageSubtitle: string;
  baseprice: number;
  discountType: "flat" | "percentage" | "none";
  discountValue: number;
  isActive: boolean;
  discription: string[];
  isHighlighted?: boolean;
  validityDays?: number;
  validityHours?: number;
  validityMins?: number;
}

const DEFAULT_PACKAGES: Package[] = [
  {
    id: "premium_monthly",
    packageId: "premium_monthly",
    packagetype: "monthly",
    packageTitle: "মাসিক প্রিমিয়াম",
    packageSubtitle: "প্রতি মাসের জন্য প্রিমিয়াম কন্টেন্ট অ্যাক্সেস করুন",
    baseprice: 200,
    discountType: "flat",
    discountValue: 50,
    isActive: true,
    isHighlighted: false,
    validityDays: 30,
    validityHours: 0,
    validityMins: 0,
    discription: [
      "সকল প্রিমিয়াম পরীক্ষা আনলকড (Unlock All Exams)",
      "প্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা (Explanations)",
      "লাইভ মেধা তালিকায় নিজের অবস্থান যাচাই (Leaderboard)",
      "পরীক্ষায় একাধিকবার অংশ নেওয়ার সুবিধা",
      "১০০% বিজ্ঞাপন মুক্ত পোর্টাল (Ad-free Interface)"
    ]
  },
  {
    id: "premium_yearly",
    packageId: "premium_yearly",
    packagetype: "yearly",
    packageTitle: "বার্ষিক প্রিমিয়াম",
    packageSubtitle: "১ বছরের জন্য আমাদের পূর্ণাঙ্গ প্রস্তুতি মেম্বারশিপ",
    baseprice: 1500,
    discountType: "percentage",
    discountValue: 20,
    isActive: true,
    isHighlighted: true,
    validityDays: 365,
    validityHours: 0,
    validityMins: 0,
    discription: [
      "সকল প্রিমিয়াম পরীক্ষা আনলকড (Unlock All Exams)",
      "প্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা (Explanations)",
      "লাইভ মেধা তালিকায় নিজের অবস্থান যাচাই (Leaderboard)",
      "পরীক্ষায় একাধিকবার অংশ নেওয়ার সুবিধা",
      "১০০% বিজ্ঞাপন মুক্ত পোর্টাল (Ad-free Interface)",
      "নতুন মডেল টেস্ট ও কুইজের ইনস্ট্যান্ট অ্যাক্সেস",
      "২৪/৭ ডেডিকেটেড লাইভ ও কাস্টমার সাপোর্ট"
    ]
  }
];

export default function AdminPackagesSettings() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Mode: "list" | "add" | "edit"
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Form states
  const [formId, setFormId] = useState("");
  const [formType, setFormType] = useState("monthly");
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formBasePrice, setFormBasePrice] = useState<number>(150);
  const [formDiscountType, setFormDiscountType] = useState<"flat" | "percentage" | "none">("none");
  const [formDiscountValue, setFormDiscountValue] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsHighlighted, setFormIsHighlighted] = useState(false);
  const [formDiscription, setFormDiscription] = useState<string>("");
  const [formValidityDays, setFormValidityDays] = useState<number>(30);
  const [formValidityHours, setFormValidityHours] = useState<number>(0);
  const [formValidityMins, setFormValidityMins] = useState<number>(0);

  // Delete modal confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Package | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(collection(db, "packages"));
      const list: Package[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        let fetchedDiscountType: "flat" | "percentage" | "none" = "none";
        if (data.discountType === "percentage") {
          fetchedDiscountType = "percentage";
        } else if (data.discountType === "flat") {
          fetchedDiscountType = "flat";
        }

        list.push({
          id: docSnap.id,
          packageId: String(data.packageId || data.id || docSnap.id),
          packagetype: String(data.packagetype || ""),
          packageTitle: String(data.packageTitle || ""),
          packageSubtitle: String(data.packageSubtitle || ""),
          baseprice: Number(data.baseprice) || 0,
          discountType: fetchedDiscountType,
          discountValue: Number(data.discountValue) || 0,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          isHighlighted: data.isHighlighted !== undefined ? Boolean(data.isHighlighted) : false,
          discription: Array.isArray(data.discription) ? data.discription : [],
          validityDays: data.validityDays !== undefined ? Number(data.validityDays) : 0,
          validityHours: data.validityHours !== undefined ? Number(data.validityHours) : 0,
          validityMins: data.validityMins !== undefined ? Number(data.validityMins) : 0
        });
      });

      if (list.length === 0) {
        // Seed initial default packages
        for (const pkg of DEFAULT_PACKAGES) {
          await setDoc(doc(db, "packages", pkg.id), pkg);
          list.push(pkg);
        }
      }

      setPackages(list);
    } catch (err: any) {
      console.error("Error fetching packages:", err);
      setError("প্যাকেজ তালিকা লোড করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenAdd = () => {
    setFormId("");
    setFormType("monthly");
    setFormTitle("");
    setFormSubtitle("");
    setFormBasePrice(150);
    setFormDiscountType("flat");
    setFormDiscountValue(0);
    setFormIsActive(true);
    setFormIsHighlighted(false);
    setFormDiscription("");
    setFormValidityDays(30);
    setFormValidityHours(0);
    setFormValidityMins(0);
    setSelectedPackage(null);
    setMode("add");
    setSuccess("");
    setError("");
  };

  const handleOpenEdit = (pkg: Package) => {
    setSelectedPackage(pkg);
    setFormId(pkg.id);
    setFormType(pkg.packagetype);
    setFormTitle(pkg.packageTitle);
    setFormSubtitle(pkg.packageSubtitle);
    setFormBasePrice(pkg.baseprice);
    setFormDiscountType(pkg.discountType);
    setFormDiscountValue(pkg.discountValue);
    setFormIsActive(pkg.isActive);
    setFormIsHighlighted(pkg.isHighlighted || false);
    setFormDiscription(pkg.discription.join("\n"));
    setFormValidityDays(pkg.validityDays !== undefined ? pkg.validityDays : 0);
    setFormValidityHours(pkg.validityHours !== undefined ? pkg.validityHours : 0);
    setFormValidityMins(pkg.validityMins !== undefined ? pkg.validityMins : 0);
    setMode("edit");
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    let finalId = formId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "-");
    if (!finalId) {
      finalId = `package_${formType}_${Date.now().toString().slice(-4)}`;
    }

    const descList = formDiscription
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      const payload = {
        id: finalId,
        packageId: finalId,
        packagetype: formType.trim(),
        packageTitle: formTitle.trim(),
        packageSubtitle: formSubtitle.trim(),
        baseprice: Number(formBasePrice),
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        isActive: Boolean(formIsActive),
        isHighlighted: Boolean(formIsHighlighted),
        discription: descList,
        validityDays: Number(formValidityDays) || 0,
        validityHours: Number(formValidityHours) || 0,
        validityMins: Number(formValidityMins) || 0,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "packages", finalId), payload, { merge: true });
      setSuccess(mode === "add" ? "নতুন প্যাকেজ সফলভাবে তৈরি করা হয়েছে!" : "প্যাকেজ সফলভাবে আপডেট করা হয়েছে!");
      trackEvent(`admin_package_${mode}_success`, { packageId: finalId });

      await fetchPackages();
      setMode("list");
    } catch (err: any) {
      console.error(err);
      setError("প্যাকেজ সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pkg: Package) => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await deleteDoc(doc(db, "packages", pkg.id));
      setSuccess(`"${pkg.packageTitle}" প্যাকেজটি সফলভাবে মুছে ফেলা হয়েছে।`);
      trackEvent("admin_package_delete_success", { packageId: pkg.id });
      await fetchPackages();
    } catch (err: any) {
      console.error(err);
      setError("প্যাকেজ মুছে ফেলতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setSubmitting(false);
      setDeleteConfirm(null);
    }
  };

  const getDiscountedPrice = (pkg: Package) => {
    if (pkg.discountType === "none") {
      return pkg.baseprice;
    } else if (pkg.discountType === "flat") {
      return Math.max(0, pkg.baseprice - pkg.discountValue);
    } else {
      return Math.max(0, Math.round(pkg.baseprice * (1 - pkg.discountValue / 100)));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden font-sans transition-colors">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans flex items-center gap-2">
            <span>Premium Pricing Packages (মেম্বারশিপ প্যাকেজ)</span>
          </h2>
          <p className="text-xs text-teal-100 mt-1">
            প্রিমিয়াম সাবস্ক্রিপশন প্ল্যানের মূল্য, ডিসকাউন্ট, মেয়াদ এবং সুবিধাগুলো এখান থেকে সাজাতে পারবেন।
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন প্যাকেজ যোগ করুন</span>
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
              <Loader2 className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto text-emerald-600" />
              <p className="text-sm text-slate-400 font-semibold">প্যাকেজসমূহ লোড হচ্ছে...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">কোনো প্যাকেজ পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                কোনো সাবস্ক্রিপশন প্যাকেজ তৈরি করা নেই। "নতুন প্যাকেজ যোগ করুন" বাটনে ক্লিক করুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packages.map((pkg) => {
                const discounted = getDiscountedPrice(pkg);
                return (
                  <div 
                    key={pkg.id} 
                    className={`p-6 border rounded-2xl flex flex-col justify-between transition-all ${
                      pkg.isActive 
                        ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700" 
                        : "bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[11px] font-mono uppercase font-black rounded-md mb-2">
                            {pkg.packagetype}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{pkg.packageTitle}</h3>
                          <p className="text-slate-400 text-[13px] mt-0.5">{pkg.packageSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pkg)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(pkg)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Pricing block */}
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{discounted} ৳</span>
                        {pkg.discountType !== "none" && pkg.discountValue > 0 && (
                          <>
                            <span className="text-xs text-slate-400 line-through">{pkg.baseprice} ৳</span>
                            <span className="text-[12px] text-rose-600 font-bold">
                              ({pkg.discountType === "flat" ? `${pkg.discountValue} ৳ ছাড়` : `${pkg.discountValue}% ছাড়`})
                            </span>
                          </>
                        )}
                      </div>

                      {/* Validity block */}
                      <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800">
                        <span className="font-extrabold text-[12px] uppercase text-slate-400">মেয়াদ (Validity):</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {pkg.validityDays || 0} দিন {pkg.validityHours || 0} ঘণ্টা {pkg.validityMins || 0} মিনিট
                        </span>
                      </div>

                      {/* Description List */}
                      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <span className="text-[12px] text-slate-400 dark:text-slate-500 font-bold block mb-1.5 uppercase tracking-wide">প্যাকেজের সুবিধাসমূহ (Features):</span>
                        <ul className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-400">
                          {pkg.discription.map((line, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold shrink-0">✓</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[12px]">
                      <span className="text-slate-400">ID: {pkg.id}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        pkg.isActive 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" 
                          : "bg-slate-150 text-slate-500"
                      }`}>
                        {pkg.isActive ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Inactive)"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ADD OR EDIT FORM */}
        {(mode === "add" || mode === "edit") && (
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
                {mode === "add" ? "নতুন প্যাকেজের তথ্য" : "প্যাকেজের তথ্য সংশোধন"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Package ID */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    প্যাকেজ আইডি (Package ID - Unique Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={mode === "edit"}
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="যেমন: premium_monthly (ছোট হাতের অক্ষর ও আন্ডারস্কোর)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold disabled:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                  />
                </div>

                {/* Package Type */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    প্যাকেজের মেয়াদ ধরন (Type) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  >
                    <option value="weekly">Weekly (সাপ্তাহিক)</option>
                    <option value="monthly">Monthly (মাসিক)</option>
                    <option value="half_yearly">Half Yearly (ষাণ্মাসিক)</option>
                    <option value="yearly">Yearly (বার্ষিক)</option>
                    <option value="custom">Custom (কাস্টম)</option>
                  </select>
                </div>

                {/* Package Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    প্যাকেজের শিরোনাম (Package Title) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="যেমন: মাসিক প্রিমিয়াম মেম্বারশিপ"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  />
                </div>

                {/* Package Subtitle */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    প্যাকেজের উপ-শিরোনাম (Package Subtitle)
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="যেমন: ১ মাসের জন্য আমাদের আকর্ষণীয় সাবস্ক্রিপশন প্ল্যান"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  />
                </div>

                {/* Base Price */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    মূল মূল্য (Base Price in BDT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  />
                </div>

                {/* Status Toggle */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    প্যাকেজ স্ট্যাটাস
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`w-full py-2.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer transition-all ${
                      formIsActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {formIsActive ? (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span>সক্রিয় (Active Plan)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>নিষ্ক্রিয় (Disabled Plan)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Highlighted Toggle */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    সেরা অফার / হাইলাইটেড প্যাকেজ
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormIsHighlighted(!formIsHighlighted)}
                    className={`w-full py-2.5 px-4 border rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer transition-all ${
                      formIsHighlighted
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400"
                        : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {formIsHighlighted ? (
                      <>
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>হাইলাইটেড (Highlighted/Featured)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-400" />
                        <span>সাধারণ (Regular Plan)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Discount Type */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    ছাড়ের ধরন (Discount Type)
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => {
                      const val = e.target.value as "flat" | "percentage" | "none";
                      setFormDiscountType(val);
                      if (val === "none") {
                        setFormDiscountValue(0);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  >
                    <option value="none">কোনো ছাড় নেই (No Discount)</option>
                    <option value="flat">Flat (যেমন: ৫০ টাকা কম)</option>
                    <option value="percentage">Percentage (যেমন: ২০% কম)</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px] opacity-100 disabled:opacity-50">
                    ছাড়ের পরিমাণ (Discount Value)
                  </label>
                  <input
                    type="number"
                    disabled={formDiscountType === "none"}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
                  />
                </div>

                {/* Package Validity Inputs */}
                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                  <span className="text-[12px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-3">প্যাকেজের মেয়াদ / মেম্বারশিপের সময়সীমা (Package Validity):</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-slate-500 dark:text-slate-400 font-bold block text-[12px]">দিন (Days) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formValidityDays}
                        onChange={(e) => setFormValidityDays(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-500 dark:text-slate-400 font-bold block text-[12px]">ঘণ্টা (Hours)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        required
                        value={formValidityHours}
                        onChange={(e) => setFormValidityHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-500 dark:text-slate-400 font-bold block text-[12px]">মিনিট (Minutes)</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        required
                        value={formValidityMins}
                        onChange={(e) => setFormValidityMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Features list (array of strings) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-500 dark:text-slate-400 font-bold tracking-wide block text-[12px]">
                    প্যাকেজের সুবিধাসমূহ (Features List - প্রতিটি সুবিধা আলাদা লাইনে লিখুন)
                  </label>
                  <textarea
                    rows={5}
                    value={formDiscription}
                    onChange={(e) => setFormDiscription(e.target.value)}
                    placeholder="সকল প্রিমিয়াম পরীক্ষা আনলকড (Unlock All Exams)&#10;প্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা (Explanations)&#10;লাইভ মেধা তালিকায় নিজের অবস্থান যাচাই (Leaderboard)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Form actions */}
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
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>প্যাকেজ সংরক্ষণ করুন</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-150 dark:border-slate-800 text-center space-y-4">
            <div className="flex justify-center">
              <ShieldAlert className="w-12 h-12 text-rose-500 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                প্যাকেজটি মুছে ফেলতে চান?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                আপনি কি নিশ্চিত যে <strong>"{deleteConfirm.packageTitle}"</strong> প্যাকেজটি মুছে ফেলতে চান? এটি ডিলিট করলে ব্যবহারকারীরা এই সাবস্ক্রিপশন প্ল্যানটি আর কিনতে পারবেন না।
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
