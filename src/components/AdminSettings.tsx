import React, { useState, useEffect } from "react";
import { APPS_SCRIPT_CODE, DEFAULT_EXAMS } from "../data";
import { Exam } from "../types";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
  Save, 
  Copy, 
  Check, 
  HelpCircle, 
  Layers, 
  Database, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Wifi, 
  CloudLightning,
  RefreshCw,
  Eye,
  Megaphone,
  UserCheck
} from "lucide-react";

interface AdminSettingsProps {
  onSettingsSaved: () => void;
  examsList: Exam[];
  onReloadExams: () => Promise<void>;
}

export default function AdminSettings({ onSettingsSaved, examsList, onReloadExams }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<"sheets" | "local" | "promotion">("sheets");
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Promotion ad settings
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adRedirectionUrl, setAdRedirectionUrl] = useState("");
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  // Admin portal credentials settings
  const [adminEmail, setAdminEmail] = useState("admin@examportal.com");
  const [adminPassword, setAdminPassword] = useState("adminpassword123");
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  // For adding a local exam
  const [newExamName, setNewExamName] = useState("");
  const [newExamTab, setNewExamTab] = useState("");
  const [newExamTime, setNewExamTime] = useState(15);
  const [newExamStatus, setNewExamStatus] = useState<"live" | "draft">("live");
  const [newExamMarkPerQ, setNewExamMarkPerQ] = useState(1);
  const [newExamPenaltyM, setNewExamPenaltyM] = useState(0.25);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const savedUrl = localStorage.getItem("googleAppsScriptUrl");
    if (savedUrl) {
      setGoogleAppsScriptUrl(savedUrl);
    }

    // Load Promotion and Admin configurations
    const loadConfig = async () => {
      try {
        const promoSnap = await getDoc(doc(db, "settings", "promotion"));
        if (promoSnap.exists()) {
          const pData = promoSnap.data();
          if (pData.home) {
            setAdImageUrl(pData.home.imageUrl || "");
            setAdRedirectionUrl(pData.home.redirectionUrl || "");
          }
        }

        const adminSnap = await getDoc(doc(db, "settings", "admin"));
        if (adminSnap.exists()) {
          const aData = adminSnap.data();
          setAdminEmail(aData.email || "admin@examportal.com");
          setAdminPassword(aData.password || "adminpassword123");
        }
      } catch (err) {
        console.warn("Could not load configurations from Firestore.", err);
      }
    };
    loadConfig();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("googleAppsScriptUrl", googleAppsScriptUrl.trim());
      onSettingsSaved();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePromotion = async () => {
    setIsSavingPromo(true);
    try {
      const docRef = doc(db, "settings", "promotion");
      await setDoc(docRef, {
        home: {
          imageUrl: adImageUrl.trim(),
          redirectionUrl: adRedirectionUrl.trim()
        }
      }, { merge: true });
      alert("Promotion/Ad settings saved to Firestore successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save promotion settings: " + err.message);
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleSaveAdminCreds = async () => {
    setIsSavingAdmin(true);
    try {
      const docRef = doc(db, "settings", "admin");
      await setDoc(docRef, {
        email: adminEmail.trim(),
        password: adminPassword.trim()
      }, { merge: true });
      alert("Admin credentials updated in Firestore successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update credentials: " + err.message);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleTestConnection = async () => {
    if (!googleAppsScriptUrl) {
      setTestResult({ success: false, message: "Please enter a Google Apps Script URL first." });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const url = `${googleAppsScriptUrl.trim()}?action=getExams`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.exams && Array.isArray(data.exams)) {
        setTestResult({ 
          success: true, 
          message: `Successfully connected! Found ${data.exams.length} exam(s) in sheet: ${data.exams.map((e: any) => e.name).join(", ")}` 
        });
      } else if (data && data.error) {
        setTestResult({ success: false, message: `Apps Script returned error: ${data.error}` });
      } else {
        setTestResult({ success: false, message: "Invalid response structure. Ensure Apps Script is published correctly." });
      }
    } catch (err: any) {
      console.error(err);
      setTestResult({ 
        success: false, 
        message: `Connection failed: ${err.message}. Make sure your script is deployed as a Web App with access 'Anyone' and CORS is correctly formatted.` 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAddExamLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    
    if (!newExamName.trim() || !newExamTab.trim()) {
      setActionError("Exam name and question tab name are required.");
      return;
    }

    const examId = newExamTab.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now().toString().slice(-4);

    try {
      const examData: Exam = {
        id: examId,
        slNo: examsList.length + 1,
        name: newExamName.trim(),
        tabName: newExamTab.trim(),
        timeLimit: Number(newExamTime) || 10,
        status: newExamStatus,
        markPerQuestion: Number(newExamMarkPerQ) !== undefined ? Number(newExamMarkPerQ) : 1,
        penaltyMark: Number(newExamPenaltyM) !== undefined ? Number(newExamPenaltyM) : 0.25
      };

      const savedExamsStr = localStorage.getItem("customExams") || "[]";
      const savedExams = JSON.parse(savedExamsStr);
      savedExams.push(examData);
      localStorage.setItem("customExams", JSON.stringify(savedExams));
      
      // Clear form
      setNewExamName("");
      setNewExamTab("");
      setNewExamTime(15);
      setNewExamMarkPerQ(1);
      setNewExamPenaltyM(0.25);
      
      await onReloadExams();
    } catch (err: any) {
      setActionError("Failed to add exam: " + err.message);
    }
  };

  const handleDeleteExamLocal = async (examId: string) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      const savedExamsStr = localStorage.getItem("customExams") || "[]";
      const savedExams = JSON.parse(savedExamsStr);
      const filteredExams = savedExams.filter((e: any) => e.id !== examId);
      localStorage.setItem("customExams", JSON.stringify(filteredExams));
      await onReloadExams();
    } catch (err: any) {
      alert("Failed to delete exam: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white p-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-indigo-300" />
          <div>
            <h2 className="text-xl font-bold">Admin Configuration Dashboard</h2>
            <p className="text-xs text-indigo-200 mt-1">
              Connect your Google Sheet questions database or configure dynamic exams instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <button
          onClick={() => setActiveTab("sheets")}
          className={`flex-1 py-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "sheets" 
              ? "border-indigo-600 text-indigo-600 bg-white" 
              : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <CloudLightning className="w-4 h-4" />
          <span>Google Sheets & Script Setup</span>
        </button>
        <button
          onClick={() => setActiveTab("local")}
          className={`flex-1 py-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "local" 
              ? "border-indigo-600 text-indigo-600 bg-white" 
              : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Custom Exams Manager</span>
        </button>
        <button
          onClick={() => setActiveTab("promotion")}
          className={`flex-1 py-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "promotion" 
              ? "border-indigo-600 text-indigo-600 bg-white" 
              : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Promotion & Settings</span>
        </button>
      </div>

      {/* Content panel */}
      <div className="p-8">
        {activeTab === "sheets" && (
          <div className="space-y-8">
            {/* Sheet URL Input */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>1. Configure Web App URL</span>
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Paste the published Google Apps Script Web App URL from your Google Sheet below.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={googleAppsScriptUrl}
                  onChange={(e) => setGoogleAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm shrink-0 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? "Saving..." : "Save URL"}</span>
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm shrink-0"
                  >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl text-sm border flex gap-2.5 items-start ${
                  testResult.success 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="break-words font-medium">{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Steps Instructions */}
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>2. Google Sheets Setup Instructions</span>
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Follow these simple steps to host exams and questions directly on Google Sheets.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Formatting columns */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 text-sm">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">A</span>
                    <span>Spreadsheet Tab Layout</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="font-bold text-slate-800">Tab 1 Name: </span>
                      <code className="bg-slate-200 py-0.5 px-1.5 rounded text-xs font-mono">Exams</code>
                      <p className="text-xs text-slate-500 mt-1">Columns must be:</p>
                      <code className="block bg-slate-100 p-2 rounded text-xs font-mono text-slate-700 overflow-x-auto mt-1 whitespace-nowrap">
                        sl no | exam name | google sheet tab | exam time | status
                      </code>
                      <p className="text-[10px] text-slate-400 mt-0.5">Example values: 1 | Science Test | GK_Questions | 10 | live</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-800">Tab 2 Name: </span>
                      <code className="bg-slate-200 py-0.5 px-1.5 rounded text-xs font-mono">Any custom tab name</code>
                      <p className="text-xs text-slate-500 mt-1">Columns must match exactly:</p>
                      <code className="block bg-slate-100 p-2 rounded text-xs font-mono text-slate-700 overflow-x-auto mt-1 whitespace-nowrap">
                        question no | question | option a | option b | option c | option d | correct answer | explanation
                      </code>
                      <p className="text-[10px] text-slate-400 mt-0.5">Example values: 1 | What is 2+2? | 3 | 4 | 5 | 6 | b | Basic addition</p>
                    </div>
                  </div>
                </div>

                {/* Google Script copy section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 text-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">B</span>
                      <span>Google Apps Script Code</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-2">
                      In your spreadsheet, go to <b>Extensions &gt; Apps Script</b>. Erase any code inside, and paste the code.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click <b>Deploy &gt; New Deployment</b>. Choose <b>Web App</b>. Change access to <b>Anyone</b>, deploy, and copy the Web App URL!
                    </p>
                  </div>

                  <button
                    onClick={copyToClipboard}
                    className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-950 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Code Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Apps Script Code Snippet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "local" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Custom Exams Creator & Fallback Overrides</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Add, preview, or remove custom exam titles right inside your application.
              </p>
            </div>

            {/* Error notifications */}
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-sm font-medium">
                {actionError}
              </div>
            )}

            {/* Add exam form */}
            <form onSubmit={handleAddExamLocal} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Exam Name</label>
                <input
                  type="text"
                  required
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  placeholder="e.g. Advanced Mathematics"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Questions Sheet Tab Name</label>
                <input
                  type="text"
                  required
                  value={newExamTab}
                  onChange={(e) => setNewExamTab(e.target.value)}
                  placeholder="e.g. Math_Questions"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Time (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={newExamTime}
                    onChange={(e) => setNewExamTime(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Status</label>
                  <select
                    value={newExamStatus}
                    onChange={(e) => setNewExamStatus(e.target.value as "live" | "draft")}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="live">Live</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Mark Per Question</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10"
                    required
                    value={newExamMarkPerQ}
                    onChange={(e) => setNewExamMarkPerQ(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Penalty Mark</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="5"
                    required
                    value={newExamPenaltyM}
                    onChange={(e) => setNewExamPenaltyM(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom Exam</span>
                </button>
              </div>
            </form>

            {/* List current exams */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">Configured Exams ({examsList.length})</h4>
              {examsList.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No exams configured yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                  {examsList.map((exam) => (
                    <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full flex items-center justify-center">
                          {exam.slNo}
                        </span>
                        <div>
                          <span className="text-sm font-semibold text-gray-800 block leading-none">{exam.name}</span>
                          <span className="text-xs text-gray-400 mt-1 block">
                            Tab: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px]">{exam.tabName}</code> | Time: {exam.timeLimit} mins
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                          exam.status === "live" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {exam.status}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteExamLocal(exam.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "promotion" && (
          <div className="space-y-10">
            {/* Promotion / Carousel Banner settings */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  <span>Dynamic Ad Carousel Configuration</span>
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Configure the promotional ad banner image and redirect landing page shown on the homepage.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Banner Image URL</label>
                    <input
                      type="url"
                      value={adImageUrl}
                      onChange={(e) => setAdImageUrl(e.target.value)}
                      placeholder="https://example.com/ad-image.jpg"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Banner Redirection URL (Landing Page)</label>
                    <input
                      type="url"
                      value={adRedirectionUrl}
                      onChange={(e) => setAdRedirectionUrl(e.target.value)}
                      placeholder="https://example.com/promotion-landing-page"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSavePromotion}
                    disabled={isSavingPromo}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingPromo ? "Saving..." : "Save Promotion Settings"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Credentials settings */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <span>Admin Credentials Security</span>
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Update the email address and password required to enter this Admin Configuration Dashboard.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Admin Login Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@examportal.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Admin Login Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="adminpassword123"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveAdminCreds}
                    disabled={isSavingAdmin}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingAdmin ? "Updating..." : "Update Admin Credentials"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
