import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Lock, Mail, ShieldAlert, Key, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToHome: () => void;
}

export default function AdminLogin({ onLoginSuccess, onBackToHome }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [inputOtp, setInputOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminCreds, setAdminCreds] = useState({
    email: "admin@examportal.com",
    password: "adminpassword123"
  });

  // Load custom admin credentials from Firestore if configured
  useEffect(() => {
    const loadCreds = async () => {
      try {
        const docRef = doc(db, "settings", "admin");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.email && data.password) {
            setAdminCreds({
              email: data.email,
              password: data.password
            });
          }
        }
      } catch (err) {
        console.warn("Could not load admin credentials from Firestore, using standard defaults.", err);
      }
    };
    loadCreds();
  }, []);

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (email.trim().toLowerCase() === adminCreds.email.toLowerCase() && password === adminCreds.password) {
      setLoading(true);
      // Simulate sending OTP
      setTimeout(() => {
        // Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);
        setStep(2);
        setSuccess("Credentials correct! OTP has been generated.");
        setLoading(false);
      }, 800);
    } else {
      setError("Incorrect Email or Password. Please try again.");
    }
  };

  const handleStepTwo = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (inputOtp === generatedOtp || inputOtp === "123456") {
      setLoading(true);
      setSuccess("OTP verified! Access granted.");
      setTimeout(() => {
        onLoginSuccess();
        setLoading(false);
      }, 1000);
    } else {
      setError("Invalid OTP. Please check the code and try again.");
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-12 bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white text-center">
        <ShieldAlert className="w-10 h-10 mx-auto text-indigo-400 mb-2" />
        <h2 className="text-xl font-bold uppercase tracking-wider">Admin Secure Portal</h2>
        <p className="text-xs text-indigo-200 mt-1">Authorized Access Only. Email, Password & OTP verification required.</p>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm font-semibold flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm font-semibold flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStepOne} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@examportal.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-gray-400">Default: <code className="font-mono bg-gray-100 p-0.5 rounded">admin@examportal.com</code></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-gray-400">Default: <code className="font-mono bg-gray-100 p-0.5 rounded">adminpassword123</code></p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Request Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStepTwo} className="space-y-6">
            {/* Display generated OTP for smooth developer testing */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 space-y-1 text-center">
              <ShieldCheck className="w-6 h-6 mx-auto text-indigo-600" />
              <p className="text-xs font-bold">DEVELOPMENT OTP CODE</p>
              <p className="text-2xl font-black tracking-widest text-indigo-700">{generatedOtp}</p>
              <p className="text-[10px] text-indigo-500/80">Use the code above or fallback <code className="font-mono bg-white px-1 rounded">123456</code> to log in.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block text-center">Enter 6-Digit OTP</label>
              <div className="relative max-w-[200px] mx-auto">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="000000"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Verify & Enter Dashboard</span>
              )}
            </button>
          </form>
        )}

        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onBackToHome}
            className="text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            ← Back to Portal Home
          </button>
        </div>
      </div>
    </div>
  );
}
