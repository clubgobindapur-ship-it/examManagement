import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { trackEvent } from "../lib/analytics";
import { motion } from "motion/react";
import { Check, Sparkles, Zap, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import PaymentModal from "./PaymentModal";

interface PricingProps {
  currentUser: any;
  onOpenAuth: () => void;
  onSuccessPayment: () => void;
}

export default function Pricing({ currentUser, onOpenAuth, onSuccessPayment }: PricingProps) {
  const [pricingConfig, setPricingConfig] = useState({
    monthlyPrice: 150,
    yearlyPrice: 1200,
    descriptions: [
      "সকল প্রিমিয়াম পরীক্ষা আনলকড (Unlock All Exams)",
      "প্রতিটি প্রশ্নের বিস্তারিত সমাধান ও ব্যাখ্যা (Explanations)",
      "লাইভ মেধা তালিকায় নিজের অবস্থান যাচাই (Leaderboard)",
      "পরীক্ষায় একাধিকবার অংশ নেওয়ার সুবিধা",
      "১০০% বিজ্ঞাপন মুক্ত পোর্টাল (Ad-free Interface)",
      "নতুন মডেল টেস্ট ও কুইজের ইনস্ট্যান্ট অ্যাক্সেস",
      "২৪/৭ ডেডিকেটেড লাইভ ও কাস্টমার সাপোর্ট"
    ]
  });
  const [loading, setLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    type: "premium_monthly" | "premium_yearly";
    name: string;
    price: number;
  } | null>(null);

  // Active user's subscription details
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isPremium: boolean;
    validUntil?: string;
    type?: string;
  }>({ isPremium: false });

  const loadPricingAndUserSubscription = async () => {
    setLoading(true);
    trackEvent("load_pricing_start");
    try {
      // 1. Fetch Pricing Config from Firestore
      const priceDoc = await getDoc(doc(db, "settings", "pricing"));
      if (priceDoc.exists()) {
        const data = priceDoc.data();
        setPricingConfig({
          monthlyPrice: Number(data.monthlyPrice) || 150,
          yearlyPrice: Number(data.yearlyPrice) || 1200,
          descriptions: Array.isArray(data.descriptions) && data.descriptions.length > 0 
            ? data.descriptions 
            : pricingConfig.descriptions
        });
      }

      // 2. Fetch User's Premium Status
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.premiumUntil) {
            const until = new Date(uData.premiumUntil);
            const now = new Date();
            if (until > now) {
              setSubscriptionStatus({
                isPremium: true,
                validUntil: until.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                type: uData.subscriptionType === "yearly" ? "Yearly Premium" : "Monthly Premium"
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading pricing/subscription info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingAndUserSubscription();
  }, [currentUser]);

  const handleSelectPlan = (type: "premium_monthly" | "premium_yearly", name: string, price: number) => {
    trackEvent("select_pricing_plan", { type, price });

    if (!currentUser) {
      alert("পেমেন্ট সাবমিট করতে প্রথমে আপনাকে লগইন করতে হবে।");
      onOpenAuth();
      return;
    }

    if (subscriptionStatus.isPremium) {
      alert("আপনার ইতিমধ্যে একটি সক্রিয় প্রিমিয়াম মেম্বারশিপ রয়েছে!");
      return;
    }

    setSelectedPlan({ type, name, price });
    setIsPaymentOpen(true);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Loader2 className="w-10 h-10 border-indigo-600 rounded-full animate-spin mx-auto text-blue-600" />
        <p className="text-sm text-slate-400 font-bold">প্ল্যানসমূহ লোড করা হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-6 max-w-5xl mx-auto font-sans">
      {/* Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Membership Access</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight sm:text-4xl">
          প্রিমিয়াম মেম্বারশিপে জয়েন করুন
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          আপনার প্রস্তুতিকে আরও গতিশীল ও সমৃদ্ধ করতে আজই প্রিমিয়াম মেম্বারশিপ নিন এবং সকল প্রিমিয়াম কুইজ, পূর্ণাঙ্গ সমাধান ব্যাখ্যা ও লাইভ পরীক্ষা আনলক করুন।
        </p>
      </div>

      {/* Subscription Status Widget */}
      {currentUser && (
        <div className="max-w-xl mx-auto">
          {subscriptionStatus.isPremium ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center gap-3 text-xs">
              <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300 block">আপনার মেম্বারশিপ স্যাটাস: প্রিমিয়াম মেম্বার ({subscriptionStatus.type})</span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">মেয়াদ শেষ হবে: <b className="text-slate-800 dark:text-slate-200 font-bold">{subscriptionStatus.validUntil}</b></span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3 text-xs">
              <ShieldAlert className="w-6 h-6 text-slate-400 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-600 dark:text-slate-400 block">আপনি বর্তমানে ফ্রি মেম্বার হিসেবে যুক্ত আছেন</span>
                <span className="text-slate-400 dark:text-slate-500 block mt-0.5">প্রস্তুতি সম্পূর্ণ করতে নিচের যেকোনো একটি সাশ্রয়ী প্ল্যান আনলক করুন।</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
        {/* Monthly Plan */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between h-full"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-lg inline-block">
                Monthly Package
              </span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">মাসিক প্রিমিয়াম</h3>
              <p className="text-xs text-slate-400">প্রতি মাসের জন্য প্রিমিয়াম কন্টেন্ট অ্যাক্সেস করুন</p>
            </div>

            <div className="flex items-baseline gap-1 text-slate-900 dark:text-white">
              <span className="text-4xl font-black">{pricingConfig.monthlyPrice}</span>
              <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400">৳ / মাস (Month)</span>
            </div>

            <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800" />

            <ul className="space-y-3.5 text-xs">
              {pricingConfig.descriptions.slice(0, 5).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleSelectPlan("premium_monthly", "Monthly Premium Membership", pricingConfig.monthlyPrice)}
              disabled={subscriptionStatus.isPremium}
              className={`w-full py-3.5 px-4 font-bold text-xs rounded-2xl cursor-pointer transition-all ${
                subscriptionStatus.isPremium
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900"
              }`}
            >
              মাসিক মেম্বারশিপ নিন
            </button>
          </div>
        </motion.div>

        {/* Yearly Plan (Best Value) */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-600 dark:border-indigo-500 p-8 shadow-md relative overflow-hidden transition-all flex flex-col justify-between h-full"
        >
          {/* Best Value Tag */}
          <div className="absolute top-0 right-0 bg-indigo-650 text-white font-extrabold font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
            Best Value • সাশ্রয়ী
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1 rounded-lg inline-block flex items-center gap-1.5 w-fit">
                <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500 shrink-0" />
                <span>Yearly Package</span>
              </span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">বার্ষিক প্রিমিয়াম</h3>
              <p className="text-xs text-slate-400">১ বছরের জন্য আমাদের পূর্ণাঙ্গ প্রস্তুতি মেম্বারশিপ</p>
            </div>

            <div className="flex items-baseline gap-1 text-slate-900 dark:text-white">
              <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{pricingConfig.yearlyPrice}</span>
              <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400">৳ / বছর (Year)</span>
            </div>

            <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800" />

            <ul className="space-y-3.5 text-xs">
              {pricingConfig.descriptions.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleSelectPlan("premium_yearly", "Yearly Premium Membership", pricingConfig.yearlyPrice)}
              disabled={subscriptionStatus.isPremium}
              className={`w-full py-3.5 px-4 font-black text-xs rounded-2xl cursor-pointer transition-all shadow-md ${
                subscriptionStatus.isPremium
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200"
              }`}
            >
              বার্ষিক মেম্বারশিপ নিন (সেরা অফার)
            </button>
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setSelectedPlan(null);
          }}
          currentUser={currentUser}
          paymentType={selectedPlan.type}
          price={selectedPlan.price}
          productName={selectedPlan.name}
          productId={selectedPlan.type}
          onSuccess={() => {
            onSuccessPayment();
          }}
        />
      )}
    </div>
  );
}
