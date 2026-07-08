import React, { useState, useEffect } from "react";
import { APPS_SCRIPT_CODE } from "../data";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { trackEvent } from "../lib/analytics";
import { 
  Save, Copy, Check, Database, Wifi, RefreshCw, ShieldAlert, CheckCircle2, UserCheck, CloudLightning, KeyRound, Sparkles, CreditCard 
} from "lucide-react";

interface AdminSettingsProps {
  onSettingsSaved: () => void;
  onReloadExams: () => Promise<void>;
}

export default function AdminSettings({ onSettingsSaved, onReloadExams }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<"sheets" | "security" | "pricing">("sheets");
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState(() => {
    return localStorage.getItem("googleAppsScriptUrl") || "";
  });
  const [gaMeasurementId, setGaMeasurementId] = useState(() => {
    return localStorage.getItem("gaMeasurementId") || "";
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Admin credentials settings
  const [adminEmail, setAdminEmail] = useState("admin@examportal.com");
  const [adminPassword, setAdminPassword] = useState("adminpassword123");
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Subscription pricing states
  const [monthlyPrice, setMonthlyPrice] = useState(150);
  const [yearlyPrice, setYearlyPrice] = useState(1200);
  const [descriptions, setDescriptions] = useState(
    "সকল প্রিমিয়াম পরীক্ষা আনলকড (Unlock All Exams)\nপ্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা (Explanations)\nলাইভ মেধা তালিকায় নিজের অবস্থান যাচাই (Leaderboard)\nপরীক্ষায় একাধিকবার অংশ নেওয়ার সুবিধা\n১০০% বিজ্ঞাপন মুক্ত পোর্টাল (Ad-free Interface)\nনতুন মডেল টেস্ট ও কুইজের ইনস্ট্যান্ট অ্যাক্সেস\n২৪/৭ ডেডিকেটেড লাইভ ও কাস্টমার সাপোর্ট"
  );
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  useEffect(() => {
    // Load credentials and config from Firestore settings/admin and settings/general
    const loadConfig = async () => {
      try {
        const adminSnap = await getDoc(doc(db, "settings", "admin"));
        if (adminSnap.exists()) {
          const aData = adminSnap.data();
          setAdminEmail(aData.email || "admin@examportal.com");
          setAdminPassword(aData.password || "adminpassword123");
        }

        const generalSnap = await getDoc(doc(db, "settings", "general"));
        if (generalSnap.exists()) {
          const gData = generalSnap.data();
          if (gData.googleAppsScriptUrl) {
            setGoogleAppsScriptUrl(gData.googleAppsScriptUrl);
            localStorage.setItem("googleAppsScriptUrl", gData.googleAppsScriptUrl);
          }
          if (gData.gaMeasurementId) {
            setGaMeasurementId(gData.gaMeasurementId);
            localStorage.setItem("gaMeasurementId", gData.gaMeasurementId);
          }
        }

        // Load settings/pricing
        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists()) {
          const pData = pricingSnap.data();
          setMonthlyPrice(pData.monthlyPrice || 150);
          setYearlyPrice(pData.yearlyPrice || 1200);
          if (Array.isArray(pData.descriptions)) {
            setDescriptions(pData.descriptions.join("\n"));
          }
        }
      } catch (err) {
        console.warn("Could not load credentials/settings from Firestore", err);
      }
    };
    loadConfig();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    trackEvent("admin_save_settings_start");
    try {
      localStorage.setItem("googleAppsScriptUrl", googleAppsScriptUrl.trim());
      localStorage.setItem("gaMeasurementId", gaMeasurementId.trim());

      // Save settings to firestore settings/general
      const docRef = doc(db, "settings", "general");
      await setDoc(docRef, { 
        googleAppsScriptUrl: googleAppsScriptUrl.trim(),
        gaMeasurementId: gaMeasurementId.trim()
      }, { merge: true });
      
      onSettingsSaved();
      setSuccess("সেটিংস সফলভাবে সংরক্ষিত হয়েছে!");
      trackEvent("admin_save_settings_success", { 
        url: googleAppsScriptUrl.trim(),
        gaMeasurementId: gaMeasurementId.trim() 
      });
    } catch (err: any) {
      console.error(err);
      setError("সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
      trackEvent("admin_save_settings_failure", { error: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAdmin(true);
    setError("");
    setSuccess("");
    trackEvent("admin_update_creds_start");

    if (!adminEmail.trim() || !adminPassword.trim()) {
      setError("ইমেইল এবং পাসওয়ার্ড খালি রাখা যাবে না।");
      setIsSavingAdmin(false);
      return;
    }

    try {
      const docRef = doc(db, "settings", "admin");
      await setDoc(docRef, {
        email: adminEmail.trim(),
        password: adminPassword.trim()
      }, { merge: true });
      setSuccess("এডমিন লগইন বিবরণী সফলভাবে আপডেট করা হয়েছে!");
      trackEvent("admin_update_creds_success", { email: adminEmail.trim() });
    } catch (err: any) {
      console.error(err);
      setError("লগইন বিবরণী আপডেট করতে ব্যর্থ হয়েছে: " + err.message);
      trackEvent("admin_update_creds_failure", { error: err.message });
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPricing(true);
    setError("");
    setSuccess("");
    trackEvent("admin_save_pricing_start");
    try {
      const docRef = doc(db, "settings", "pricing");
      const descList = descriptions
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      await setDoc(docRef, {
        monthlyPrice: Number(monthlyPrice) || 150,
        yearlyPrice: Number(yearlyPrice) || 1200,
        descriptions: descList
      }, { merge: true });

      setSuccess("সাবস্ক্রিপশন প্যাকেজের মূল্য তালিকা সফলভাবে সংরক্ষিত হয়েছে!");
      trackEvent("admin_save_pricing_success", { monthlyPrice, yearlyPrice });
    } catch (err: any) {
      console.error(err);
      setError("মূল্য তালিকা সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
      trackEvent("admin_save_pricing_failure", { error: err.message });
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleTestConnection = async () => {
    if (!googleAppsScriptUrl) {
      setTestResult({ success: false, message: "দয়া করে প্রথমে একটি গুগল অ্যাপস স্ক্রিপ্ট ইউআরএল লিখুন।" });
      trackEvent("admin_test_sheets_connection_empty");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    trackEvent("admin_test_sheets_connection_start", { url: googleAppsScriptUrl.trim() });

    try {
      const url = `${googleAppsScriptUrl.trim()}?action=getExams`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.exams && Array.isArray(data.exams)) {
        setTestResult({ 
          success: true, 
          message: `সংযোগ সফল হয়েছে! মোট ${data.exams.length}টি পরীক্ষা পাওয়া গিয়েছে: ${data.exams.map((e: any) => e.name).join(", ")}` 
        });
        trackEvent("admin_test_sheets_connection_success", { examCount: data.exams.length });
      } else if (data && data.error) {
        setTestResult({ success: false, message: `অ্যাপস স্ক্রিপ্ট ত্রুটি প্রদর্শন করছে: ${data.error}` });
        trackEvent("admin_test_sheets_connection_script_error", { error: data.error });
      } else {
        setTestResult({ success: false, message: "রেসপন্স বিন্যাস সঠিক নয়। নিশ্চিত হোন স্ক্রিপ্টটি সঠিকভাবে ওয়েব অ্যাপ হিসেবে পাবলিশ করা হয়েছে কিনা।" });
        trackEvent("admin_test_sheets_connection_invalid_format");
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({ 
        success: false, 
        message: `সংযোগ ব্যর্থ হয়েছে: ${err.message}। স্ক্রিপ্টটি Web App হিসেবে 'Anyone' অ্যাক্সেস দিয়ে পাবলিশ করা আছে কিনা নিশ্চিত করুন।` 
      });
      trackEvent("admin_test_sheets_connection_failure", { error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopied(true);
    trackEvent("admin_copy_apps_script_code");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white p-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-indigo-300" />
          <div>
            <h2 className="text-xl font-bold font-sans">Exam & Portal Settings</h2>
            <p className="text-xs text-indigo-200 mt-1">
              গুগল স্প্রেডশিট প্রশ্ন সংযোগ স্থাপন করুন এবং এডমিন সিকিউরিটি অ্যাক্সেস আপডেট করুন।
            </p>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={() => {
            setActiveTab("sheets");
            trackEvent("admin_settings_tab_sheets");
          }}
          className={`flex-1 py-4 px-6 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "sheets" 
              ? "border-blue-600 text-blue-600 bg-white" 
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <CloudLightning className="w-4 h-4" />
          <span>Google Sheets & Script Setup</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("security");
            trackEvent("admin_settings_tab_security");
          }}
          className={`flex-1 py-4 px-6 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "security" 
              ? "border-blue-600 text-blue-600 bg-white" 
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Admin Security Credentials</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("pricing");
            trackEvent("admin_settings_tab_pricing");
          }}
          className={`flex-1 py-4 px-6 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "pricing" 
              ? "border-blue-600 text-blue-600 bg-white" 
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Subscription Packages Pricing</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="p-8">
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

        {activeTab === "sheets" && (
          <div className="space-y-8">
            {/* Sheet URL & GA4 Input */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>1. Web App API Endpoint</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    গুগল স্প্রেডশিট থেকে জেনারেট করা গুগল অ্যাপস স্ক্রিপ্ট ওয়েব অ্যাপ ইউআরএলটি এখানে পেস্ট করুন।
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={googleAppsScriptUrl}
                    onChange={(e) => setGoogleAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shrink-0 cursor-pointer"
                  >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    <span>টেস্ট কানেকশন</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl text-xs border flex gap-2.5 items-start ${
                    testResult.success 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                      : "bg-rose-50 border-rose-100 text-rose-800"
                  }`}>
                    {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span className="break-words font-semibold leading-relaxed">{testResult.message}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>2. Google Analytics (GA4) Integration</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    আপনার গুগল অ্যানালিটিক্স ৪-এর মেজারমেন্ট আইডি (Measurement ID) এখানে সংযুক্ত করুন (যেমন: G-XXXXXXXXXX)।
                  </p>
                </div>

                <input
                  type="text"
                  value={gaMeasurementId}
                  onChange={(e) => setGaMeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "সংরক্ষণ..." : "সেটিংস সংরক্ষণ করুন"}</span>
                </button>
              </div>
            </div>

            {/* Instruction cards */}
            <div className="pt-6 border-t border-slate-100 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  <span>2. Google Sheets Setup & Guidelines</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  স্প্রেডশিটে কীভাবে পরীক্ষা ও প্রশ্ন ফরম্যাট করবেন তা নিচের নির্দেশনাগুলো থেকে জেনে নিন।
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-xs">
                {/* Formatting columns */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-mono">A</span>
                    <span>Spreadsheet Tab Layout</span>
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <span className="font-bold text-slate-800">ট্যাব ১ নাম (অবশ্যই হতে হবে): </span>
                      <code className="bg-slate-200 py-0.5 px-1.5 rounded font-mono text-[10px]">Exams</code>
                      <p className="text-[11px] text-slate-500 mt-1">কলামের নামগুলো যথাক্রমে:</p>
                      <code className="block bg-slate-100 p-2 rounded font-mono text-[10px] text-slate-700 overflow-x-auto mt-1 whitespace-nowrap">
                        sl no | exam name | google sheet tab | exam time | status
                      </code>
                      <p className="text-[10px] text-slate-400 mt-0.5">উদাহরণ: 1 | BCS Practice | BCS_GK | 15 | live</p>
                    </div>

                    <div className="pt-3 border-t border-slate-200">
                      <span className="font-bold text-slate-800">ট্যাব ২ নাম (যেকোনো পছন্দসই ট্যাব): </span>
                      <code className="bg-slate-200 py-0.5 px-1.5 rounded font-mono text-[10px]">BCS_GK</code>
                      <p className="text-[11px] text-slate-500 mt-1">কলামের বিন্যাস হতে হবে:</p>
                      <code className="block bg-slate-100 p-2 rounded font-mono text-[10px] text-slate-700 overflow-x-auto mt-1 whitespace-nowrap">
                        question no | question | option a | option b | option c | option d | correct answer | explanation
                      </code>
                      <p className="text-[10px] text-slate-400 mt-0.5">উদাহরণ: 1 | বাংলাদেশের রাজধানী কোনটি? | খুলনা | ঢাকা | সিলেট | রাজশাহী | b | ঢাকা বাংলাদেশের রাজধানী।</p>
                    </div>
                  </div>
                </div>

                {/* Google Script copy section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-mono">B</span>
                      <span>Google Apps Script Implementation</span>
                    </h4>
                    <p className="text-slate-500 leading-relaxed mt-2">
                      ১. আপনার গুগল শিটের ভিতরে মেনুবার থেকে <b>Extensions &gt; Apps Script</b> এ যান।
                    </p>
                    <p className="text-slate-500 leading-relaxed mt-1">
                      ২. সেখানে থাকা পূর্ববর্তী যেকোনো কোড মুছে ফেলে নিচের কোডটি কপি করে পেস্ট করুন।
                    </p>
                    <p className="text-slate-500 leading-relaxed mt-1">
                      ৩. এরপর <b>Deploy &gt; New Deployment</b> সিলেক্ট করুন। টাইপ হিসেবে <b>Web App</b> সিলেক্ট করে Access দিন <b>Anyone</b> এবং ডেপ্লয় করুন।
                    </p>
                  </div>

                  <button
                    onClick={copyToClipboard}
                    className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>কোড সফলভাবে কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Google Apps Script Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <form onSubmit={handleSaveAdminCreds} className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>Admin Login Credentials Settings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                এডমিন সিকিউরিটি ড্যাশবোর্ডে লগইন করার জন্য আপনার পাসওয়ার্ড ও ইমেইল আপডেট করুন।
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide block">Admin Login Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@examportal.com"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide block">Admin Login Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingAdmin}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingAdmin ? "আপডেট হচ্ছে..." : "লগইন তথ্য আপডেট করুন"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === "pricing" && (
          <form onSubmit={handleSavePricing} className="space-y-6 text-xs font-semibold">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <span>Subscription Packages & Pricing Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                মাসিক ও বার্ষিক প্রিমিয়াম মেম্বারশিপের মূল্য তালিকা এবং ফিচারসমূহ আপডেট করুন।
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide block">Monthly Pack Price (BDT)</label>
                  <input
                    type="number"
                    required
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    placeholder="150"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide block">Yearly Pack Price (BDT)</label>
                  <input
                    type="number"
                    required
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(Number(e.target.value))}
                    placeholder="1200"
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide block">Features / Descriptions (One per line)</label>
                <textarea
                  required
                  rows={6}
                  value={descriptions}
                  onChange={(e) => setDescriptions(e.target.value)}
                  placeholder="ফিচারসমূহ লিখুন..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-sans"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPricing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPricing ? "সংরক্ষণ হচ্ছে..." : "মূল্য তালিকা সংরক্ষণ করুন"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
