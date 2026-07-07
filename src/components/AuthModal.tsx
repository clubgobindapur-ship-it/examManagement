import React, { useState } from "react";
import { auth, db } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User, LogIn, UserPlus, LogOut, CheckCircle, AlertCircle, Phone, GraduationCap, Briefcase } from "lucide-react";
import { trackEvent } from "../lib/analytics";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function AuthModal({ isOpen, onClose, currentUser }: AuthModalProps) {
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
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100 scrollbar-thin"
      >
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {currentUser ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Signed In</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You are logged in as <span className="font-medium text-gray-700">{currentUser.displayName || "Candidate"}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{currentUser.email}</p>
              </div>

              {success && (
                <div className="flex items-center gap-2 justify-center text-sm text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full py-3 px-4 bg-rose-50 text-rose-600 font-medium hover:bg-rose-100 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
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
