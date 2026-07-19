import React, { useState } from "react";
import { auth, db } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User, LogIn, UserPlus, LogOut, CheckCircle, AlertCircle, Phone, GraduationCap, Briefcase, Loader2, Sparkles, ShieldCheck, Award, Trophy, BookOpen } from "lucide-react";
import { trackEvent } from "../lib/analytics";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userAttempts?: any[];
  exams?: any[];
}

export default function AuthModal({ isOpen, onClose, currentUser, userAttempts = [], exams = [] }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  // New sign up fields
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [jobPreferences, setJobPreferences] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "subscriptions" | "results">("profile");

  // Personal Results
  const [personalResults, setPersonalResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Profile Subscriptions fields
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [profileData, setProfileData] = useState<{
    premiumUntil: string | null;
    subscriptionType: string | null;
    phone?: string;
    studyLevel?: string;
    subscriptionsList?: {
      packageId: string;
      packageName: string;
      activatedAt: string;
      premiumUntil: string;
    }[];
  } | null>(null);
  const [purchasedPacks, setPurchasedPacks] = useState<{ id: string; name: string; amount: number; status: string; date: string; txId: string; method: string }[]>([]);

  React.useEffect(() => {
    if (isOpen && currentUser) {
      const fetchProfileAndSubscriptions = async () => {
        setLoadingSubscriptions(true);
        try {
          // 1. Fetch user doc
          const uDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (uDoc.exists()) {
            const data = uDoc.data();
            setProfileData({
              premiumUntil: data.premiumUntil || null,
              subscriptionType: data.subscriptionType || null,
              phone: data.phone || "",
              studyLevel: data.studyLevel || "",
              subscriptionsList: data.subscriptionsList || []
            });
          } else {
            setProfileData(null);
          }

          // 2. Fetch purchase history (transactions)
          const q = query(collection(db, "transactions"), where("userId", "==", currentUser.uid));
          const txSnap = await getDocs(q);
          const txList: any[] = [];
          txSnap.forEach(d => {
            const data = d.data();
            txList.push({
              id: d.id,
              name: data.examName || "Premium Package",
              amount: Number(data.amount) || 0,
              status: data.status || "pending",
              date: data.createdAt ? new Date(data.createdAt).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" }) : "",
              txId: data.transactionId || "",
              method: data.paymentMethod || "bKash"
            });
          });
          // Sort by date (descending)
          txList.sort((a, b) => b.id.localeCompare(a.id));
          setPurchasedPacks(txList);
        } catch (err) {
          console.error("Error loading profile subscription data:", err);
        } finally {
          setLoadingSubscriptions(false);
        }
      };

      fetchProfileAndSubscriptions();
    }
  }, [isOpen, currentUser]);

  // Load and calculate results for the user's attempted published exams
  React.useEffect(() => {
    if (activeTab === "results" && currentUser && exams.length > 0) {
      const fetchPersonalResults = async () => {
        setLoadingResults(true);
        try {
          // Find all published exams
          const publishedExams = exams.filter(e => e.showResult === true);
          if (publishedExams.length === 0) {
            setPersonalResults([]);
            setLoadingResults(false);
            return;
          }

          // Fetch all attempts for these published exams to calculate ranking and pass/fail accurately
          const resultsList: any[] = [];

          for (const exam of publishedExams) {
            // Check if current user attempted this exam
            const userAttempt = (userAttempts || []).find(att => att.examId === exam.id);
            if (!userAttempt) continue; // Skip if user didn't take this exam

            // Query all attempts for this exam to calculate the rank & pass/fail
            const q = query(collection(db, "attempts"), where("examId", "==", exam.id));
            const snap = await getDocs(q);
            const allAttempts: any[] = [];
            snap.forEach(doc => {
              allAttempts.push({ id: doc.id, ...doc.data() });
            });

            // Sort all attempts to find correct rank
            const sorted = [...allAttempts].sort((a, b) => {
              const aMark = a.totalObtainedMark !== undefined ? a.totalObtainedMark : (a.score || 0);
              const bMark = b.totalObtainedMark !== undefined ? b.totalObtainedMark : (b.score || 0);
              if (bMark !== aMark) return bMark - aMark;
              if ((a.timeTaken || 0) !== (b.timeTaken || 0)) {
                return (a.timeTaken || 0) - (b.timeTaken || 0);
              }
              return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
            });

            const totalCount = sorted.length;
            const passPercentage = exam.passPercentage || 40;
            const minPassMark = exam.minPassMark || 0;
            const passLimit = Math.max(1, Math.round((totalCount * passPercentage) / 100));

            // Find current user's index in sorted attempts
            const userIndex = sorted.findIndex(att => att.userId === currentUser.uid);
            if (userIndex !== -1) {
              const rank = userIndex + 1;
              const myAttempt = sorted[userIndex];
              const obtainedMark = myAttempt.totalObtainedMark !== undefined ? myAttempt.totalObtainedMark : (myAttempt.score || 0);
              
              // New pass condition: rank <= passLimit AND obtainedMark >= minPassMark
              const isPass = totalCount > 0 ? (rank <= passLimit && obtainedMark >= minPassMark) : false;

              resultsList.push({
                examId: exam.id,
                examName: exam.name,
                obtainedMark,
                totalQuestions: myAttempt.totalQuestions || 10,
                correctCount: myAttempt.correctCount || 0,
                wrongCount: myAttempt.wrongCount || 0,
                skippedCount: myAttempt.skippedCount || 0,
                totalExamMark: myAttempt.examTotalMark !== undefined ? myAttempt.examTotalMark : ((myAttempt.totalQuestions || 10) * (exam.markPerQuestion || 1)),
                rank,
                totalParticipants: totalCount,
                isPass,
                passPercentage,
                minPassMark,
                completedAt: myAttempt.completedAt
              });
            }
          }

          // Sort personal results by completion date (newest first)
          resultsList.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
          setPersonalResults(resultsList);
        } catch (err) {
          console.error("Error fetching personal results:", err);
        } finally {
          setLoadingResults(false);
        }
      };

      fetchPersonalResults();
    }
  }, [activeTab, currentUser, exams, userAttempts]);

  const handlePreferenceToggle = (pref: string) => {
    setJobPreferences(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email.trim()) {
          throw new Error("Please enter your email address.");
        }
        await sendPasswordResetEmail(auth, email.trim());
        setSuccess("Password reset link sent to your email!");
        setTimeout(() => {
          setIsForgotPassword(false);
          setError("");
          setSuccess("");
        }, 3000);
        return;
      }

      if (isSignUp) {
        if (!username.trim()) {
          throw new Error("Name/Username is required");
        }
        if (username.length < 2) {
          throw new Error("Name must be at least 2 characters");
        }
        if (!phone.trim()) {
          throw new Error("Phone number is required");
        }
        if (!gender) {
          throw new Error("Please select your gender");
        }
        if (!studyLevel) {
          throw new Error("Please select your current study level");
        }
        if (jobPreferences.length === 0) {
          throw new Error("Please select at least one job preference");
        }
        
        // Sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, { displayName: username.trim() });

        // Save in Firestore 'users' collection
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          gender: gender,
          studyLevel: studyLevel,
          jobPreferences: jobPreferences,
          createdAt: new Date().toISOString()
        });

        trackEvent("sign_up", { email: email.trim(), method: "email" });

        setSuccess("Account created successfully!");
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1500);
      } else {
        // Log in
        await signInWithEmailAndPassword(auth, email.trim(), password);
        trackEvent("login", { email: email.trim(), method: "email" });
        setSuccess("Welcome back!");
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      // Clean error messages for user
      let errMsg = err.message || "An authentication error occurred";
      if (err.code === "auth/user-not-found") {
        errMsg = "User not found. Please check your email or sign up.";
      } else if (err.code === "auth/wrong-password") {
        errMsg = "Incorrect password. Please try again or reset it.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered. Please login instead.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setPhone("");
    setGender("");
    setStudyLevel("");
    setJobPreferences([]);
    setError("");
    setSuccess("");
    setIsSignUp(false);
    setIsForgotPassword(false);
    setActiveTab("profile");
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      trackEvent("logout");
      setSuccess("Logged out successfully");
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 scrollbar-thin"
      >
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {currentUser ? (
            <div className="space-y-6 py-2">
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/55 dark:border-slate-850 p-5 rounded-2xl text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">প্রোফাইল (Profile)</h3>
                  <div className="mt-4 space-y-2 text-left bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                      <span className="font-semibold">পরীক্ষার্থী (Name):</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{currentUser.displayName || "পরীক্ষার্থী"}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                      <span className="font-semibold">ইমেইল (Email):</span>
                      <span className="font-bold text-slate-700 dark:text-slate-350 font-mono text-[12px]">{currentUser.email}</span>
                    </p>
                    {profileData?.phone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                        <span className="font-semibold">মোবাইল (Phone):</span>
                        <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">{profileData.phone}</span>
                      </p>
                    )}
                    {profileData?.studyLevel && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center py-1.5">
                        <span className="font-semibold">শিক্ষাগত যোগ্যতা:</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{profileData.studyLevel}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Premium Status Banner */}
              {profileData && profileData.premiumUntil && new Date(profileData.premiumUntil) > new Date() ? (
                <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-200/50 dark:border-amber-500/30 p-4 rounded-2xl text-left space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="font-extrabold text-xs text-amber-800 dark:text-amber-400">প্রিমিয়াম মেম্বারশিপ সক্রিয়!</span>
                  </div>
                  <p className="text-[13px] text-slate-600 dark:text-slate-350 font-semibold">
                    প্যাকেজের ধরন: <b className="text-indigo-600 dark:text-indigo-400 uppercase font-black">{profileData.subscriptionType || "Custom"}</b>
                  </p>
                  <p className="text-[13px] text-slate-600 dark:text-slate-350 font-semibold">
                    মেয়াদ শেষ হবে: <b className="text-slate-700 dark:text-slate-200 font-bold">
                      {new Date(profileData.premiumUntil).toLocaleString("bn-BD", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </b>
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl text-left">
                  <span className="font-bold text-xs text-slate-600 dark:text-slate-300 block">বর্তমান স্ট্যাটাস: ফ্রি মেম্বার</span>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">সব প্রিমিয়াম পরীক্ষা ও ব্যাখ্যা আনলক করতে যেকোনো একটি প্রিমিয়াম প্যাকেজ কিনুন।</p>
                </div>
              )}

              {activeTab === "profile" ? (
                <div className="text-center p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-350">
                    ফলাফল ও সাবস্ক্রিপশন পৃষ্ঠা এখন সরাসরি মেনুতে পাবেন!
                  </p>
                  <p className="text-[12px] text-slate-400">
                    বামদিকের প্রধান মেনু থেকে "আমার ফলাফল" এবং "আমার সাবস্ক্রিপশন" দেখতে পাবেন।
                  </p>
                </div>
              ) : activeTab === "results" ? (
                /* Results List Tab */
                <div className="border-t border-slate-150 dark:border-slate-800 pt-4 text-left space-y-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer mb-2"
                  >
                    ← প্রোফাইলে ফিরে যান (Back to Profile)
                  </button>

                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-250 block mb-3 uppercase tracking-wider">আমার পরীক্ষার ফলাফল (My Exam Results)</span>
                    {loadingResults ? (
                      <div className="py-8 text-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                        <span className="text-[12px] text-slate-400 font-bold block">ফলাফল তৈরি হচ্ছে...</span>
                      </div>
                    ) : personalResults.length > 0 ? (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {personalResults.map((res, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[13px] space-y-2 transition-all hover:border-slate-200 dark:hover:border-slate-750"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs leading-snug">
                                {res.examName}
                              </span>
                              <span className={`inline-block px-1.5 py-0.5 rounded-md text-[11px] font-black uppercase shrink-0 ${
                                res.isPass 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
                                  : "bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450"
                              }`}>
                                {res.isPass ? "উত্তীর্ণ" : "অনুত্তীর্ণ"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/50 font-bold">
                              <div>
                                প্রাপ্ত নম্বর: <span className="font-black text-slate-800 dark:text-slate-200">{res.obtainedMark}</span> / {res.totalExamMark}
                              </div>
                              <div className="text-right">
                                মেধা স্থান (Rank): <span className="font-black text-indigo-600 dark:text-indigo-400">{res.rank}</span> / {res.totalParticipants}
                              </div>
                              <div className="col-span-2 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
                                <span>সঠিক: {res.correctCount} | ভুল: {res.wrongCount} | বাদ: {res.skippedCount}</span>
                                <span>{new Date(res.completedAt).toLocaleDateString("bn-BD")}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-5 bg-slate-50 dark:bg-slate-800/10 rounded-xl font-bold">কোনো প্রকাশিত পরীক্ষার ফলাফল পাওয়া যায়নি।</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Subscriptions List & Payment History Tab */
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left space-y-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-450 dark:hover:text-indigo-350 transition-colors cursor-pointer mb-2"
                  >
                    ← প্রোফাইলে ফিরে যান (Back to Profile)
                  </button>

                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-2 uppercase tracking-wider">সক্রিয় মেম্বারশিপ তালিকা (Active Subscriptions)</span>
                    {profileData?.subscriptionsList && profileData.subscriptionsList.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {profileData.subscriptionsList.map((sub, idx) => {
                          const isExpired = new Date(sub.premiumUntil) < new Date();
                          return (
                            <div key={idx} className="p-3 bg-indigo-50/40 dark:bg-slate-800/80 rounded-xl border border-indigo-100/60 dark:border-slate-850 text-[13px] flex justify-between items-center gap-4">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  {sub.packageName}
                                </span>
                                <span className="text-slate-400 text-[12px] block">
                                  প্যাকেজ আইডি: <b className="font-mono text-slate-600 dark:text-slate-300">{sub.packageId}</b>
                                </span>
                                <span className="text-slate-400 text-[12px] block">
                                  শুরু: {new Date(sub.activatedAt).toLocaleDateString("bn-BD")}
                                </span>
                              </div>
                              <div className="text-right shrink-0 space-y-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[11px] font-black uppercase ${
                                  isExpired 
                                    ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" 
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                }`}>
                                  {isExpired ? "মেয়াদোত্তীর্ণ" : "সক্রিয়"}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-[12px] block">
                                  মেয়াদ: {new Date(sub.premiumUntil).toLocaleDateString("bn-BD")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-3 bg-slate-50 dark:bg-slate-800/10 rounded-xl">কোনো সক্রিয় প্রিমিয়াম প্যাকেজ পাওয়া যায়নি।</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-2 uppercase tracking-wider">পেমেন্ট ইতিহাস (Payment History)</span>
                    {loadingSubscriptions ? (
                      <div className="py-6 text-center space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
                        <span className="text-[12px] text-slate-400 font-bold block">তালিকা লোড হচ্ছে...</span>
                      </div>
                    ) : purchasedPacks.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {purchasedPacks.map((pack) => {
                          const isVerified = pack.status === "verified";
                          const isRejected = pack.status === "rejected";
                          return (
                            <div key={pack.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100/80 dark:border-slate-800 text-[13px] flex justify-between items-center gap-4 transition-all hover:border-slate-200 dark:hover:border-slate-750">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{pack.name}</span>
                                <span className="text-slate-400 text-[12px] block">
                                  TxID: <b className="font-mono text-slate-600 dark:text-slate-300">{pack.txId}</b> ({pack.method})
                                </span>
                                <span className="text-slate-400 text-[12px] block">তারিখ: {pack.date || "N/A"}</span>
                              </div>
                              <div className="text-right shrink-0 space-y-1">
                                <span className="font-black text-slate-900 dark:text-white block">{pack.amount} ৳</span>
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                                  isVerified 
                                    ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400" 
                                    : isRejected
                                    ? "bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-400"
                                    : "bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}>
                                  {isVerified ? "সক্রিয়" : isRejected ? "প্রত্যাখ্যাত" : "অপেক্ষমান"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-3 bg-slate-50 dark:bg-slate-800/10 rounded-xl">কোনো ক্রয়ের ইতিহাস নেই।</p>
                    )}
                  </div>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 justify-center text-xs text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-xs animate-none"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {isForgotPassword ? "Reset Password" : isSignUp ? "Create an Account" : "Welcome Back"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isForgotPassword 
                    ? "Enter your email address to receive a password reset link." 
                    : isSignUp 
                    ? "Sign up to track your scores permanently on the leaderboard" 
                    : "Sign in to save your results under your profile"}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 py-2.5 px-3 rounded-xl border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Your Name (নাম)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="যেমন: সাকিব হাসান"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {!isForgotPassword && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                {isSignUp && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone Number (মোবাইল নম্বর)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01xxxxxxxxx"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Gender (লিঙ্গ)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Male", "Female", "Other"].map((g) => (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setGender(g)}
                            className={`py-2 px-3 border text-xs font-medium rounded-xl transition-all cursor-pointer ${
                              gender === g 
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold" 
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {g === "Male" ? "Male (পুরুষ)" : g === "Female" ? "Female (মহিলা)" : "Other (অন্যান্য)"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Current Study Level (বর্তমান শিক্ষাগত যোগ্যতা)</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                          value={studyLevel}
                          onChange={(e) => setStudyLevel(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm appearance-none cursor-pointer"
                        >
                          <option value="">Select Level</option>
                          <option value="SSC">SSC (এসএসসি)</option>
                          <option value="HSC">HSC (এইচএসসি)</option>
                          <option value="Hons">Hons (অনার্স/স্নাতক)</option>
                          <option value="Masters">Masters (মাস্টার্স/স্নাতকোত্তর)</option>
                          <option value="Others">Others (অন্যান্য)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Job Preferences (পছন্দের চাকুরীর ক্ষেত্রসমূহ - একাধিক পছন্দ করুন)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["BCS", "Govt Job", "Private", "Bank", "Teacher", "9th grade", "10-20th grade", "others"].map((pref) => {
                          const isSelected = jobPreferences.includes(pref);
                          return (
                            <button
                              type="button"
                              key={pref}
                              onClick={() => handlePreferenceToggle(pref)}
                              className={`py-1.5 px-3 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {pref}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {!isSignUp && !isForgotPassword && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError("");
                        setSuccess("");
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Forgot Password? (পাসওয়ার্ড ভুলে গেছেন?)
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isForgotPassword ? (
                    <span>Send Reset Link (লিংক পাঠান)</span>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Sign Up (নিবন্ধন করুন)</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In (প্রবেশ করুন)</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-gray-100 flex flex-col gap-2">
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Back to Sign In (লগইন-এ ফিরে যান)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
