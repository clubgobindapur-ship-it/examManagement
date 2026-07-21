import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { motion } from "motion/react";
import { Sparkles, Loader2, LogIn, CreditCard, CheckCircle2, XCircle, AlertCircle, Calendar, ShieldCheck, ShoppingCart } from "lucide-react";

interface MySubscriptionsProps {
  currentUser: any;
  onOpenAuth: () => void;
  onViewChange: (view: any) => void;
}

export default function MySubscriptions({ currentUser, onOpenAuth, onViewChange }: MySubscriptionsProps) {
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchSubscriptionsAndPayments = async () => {
      setLoading(true);
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
        }

        // 2. Fetch transactions
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
        // Sort newest first
        txList.sort((a, b) => b.id.localeCompare(a.id));
        setPurchasedPacks(txList);
      } catch (err) {
        console.error("Error loading profile subscription data:");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionsAndPayments();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center text-amber-500">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">আমার সাবস্ক্রিপশন (My Subscriptions)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            আপনার কেনা প্রিমিয়াম প্যাকেজ, পেমেন্ট ও মেয়াদ দেখতে দয়া করে আপনার অ্যাকাউন্টে লগইন করুন।
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
        >
          <LogIn className="w-4 h-4" />
          <span>লগইন করুন</span>
        </button>
      </div>
    );
  }

  const isPremium = profileData && profileData.premiumUntil && new Date(profileData.premiumUntil) > new Date();

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/5 rounded-full blur-xl" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Sparkles className="w-6 h-6 text-amber-400 fill-amber-400/20 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">আমার সাবস্ক্রিপশন ও পেমেন্ট (My Subscriptions)</h2>
            <p className="text-xs text-indigo-100 mt-1">আপনার প্রিমিয়াম প্যাকেজ তালিকা, মেয়াদ এবং পেমেন্ট ভেরিফিকেশন স্ট্যাটাস।</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">পেমেন্ট ইতিহাস লোড হচ্ছে, অপেক্ষা করুন...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left / Status Section */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-850">মেম্বারশিপ স্ট্যাটাস</h3>
              
              {isPremium ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-200/50 dark:border-amber-500/30 p-4 rounded-xl space-y-2 text-center">
                    <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-extrabold text-sm text-amber-800 dark:text-amber-400">প্রিমিয়াম মেম্বারশিপ সক্রিয়!</p>
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg">
                    <p className="flex justify-between">
                      <span>প্যাকেজ টাইপ:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 uppercase font-black">{profileData?.subscriptionType}</span>
                    </p>
                    <p className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5">
                      <span>মেয়াদ শেষ হবে:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {new Date(profileData?.premiumUntil!).toLocaleDateString("bn-BD")}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-850 p-4 rounded-xl text-center space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-xs text-slate-600 dark:text-slate-300">বর্তমান স্ট্যাটাস: ফ্রি মেম্বার</p>
                    <p className="text-[13px] text-slate-500 leading-relaxed">সব প্রিমিয়াম পরীক্ষা ও ব্যাখ্যা আনলক করতে যেকোনো একটি প্রিমিয়াম প্যাকেজ কিনুন।</p>
                  </div>
                  
                  <button
                    onClick={() => onViewChange("pricing")}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20"
                  >
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    <span>প্রিমিয়াম প্যাকেজ কিনুন</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active packages list detail */}
            {profileData?.subscriptionsList && profileData.subscriptionsList.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-850">অনুমোদিত কোর্স/প্যাকেজ</h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {profileData.subscriptionsList.map((sub, idx) => {
                    const isExpired = new Date(sub.premiumUntil) < new Date();
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 rounded-xl text-[13px] flex justify-between items-center">
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block">{sub.packageName}</span>
                          <span className="text-slate-400 text-[11px] block">শুরু: {new Date(sub.activatedAt).toLocaleDateString("bn-BD")}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-black uppercase shrink-0 ${
                          isExpired 
                            ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" 
                            : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                        }`}>
                          {isExpired ? "মেয়াদ শেষ" : "সক্রিয়"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right / Transaction History Section */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-850 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>পেমেন্ট ইতিহাস ও ভেরিফিকেশন (Payment History)</span>
            </h3>

            {purchasedPacks.length > 0 ? (
              <div className="space-y-3">
                {purchasedPacks.map((pack) => {
                  const isVerified = pack.status === "verified";
                  const isRejected = pack.status === "rejected";
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={pack.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-850 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 dark:text-white text-sm">{pack.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-slate-800/60 border border-indigo-100/40 dark:border-slate-700/60 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase rounded-md font-mono">{pack.method}</span>
                        </div>
                        <div className="space-y-0.5 text-slate-400 dark:text-slate-500 text-[12px] font-bold">
                          <p>Transaction ID: <b className="font-mono text-slate-600 dark:text-slate-300 uppercase">{pack.txId}</b></p>
                          <p>পেমেন্ট তারিখ: {pack.date || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-150 dark:border-slate-800/60 gap-1">
                        <span className="font-black text-slate-900 dark:text-white text-base leading-none">{pack.amount} ৳</span>
                        <div className="mt-1">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 rounded-md text-[11px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>সক্রিয় (Verified)</span>
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/35 rounded-md text-[11px] font-black uppercase">
                              <XCircle className="w-3 h-3" />
                              <span>প্রত্যাখ্যাত (Rejected)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/35 rounded-md text-[11px] font-black uppercase">
                              <AlertCircle className="w-3 h-3" />
                              <span>অপেক্ষমান (Pending)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 p-8 text-center text-slate-400">
                <p className="text-xs font-bold">কোনো পেমেন্ট ভেরিফিকেশন বা ক্রয়ের ইতিহাস পাওয়া যায়নি।</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
