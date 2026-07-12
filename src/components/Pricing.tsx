import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { trackEvent } from "../lib/analytics";
import { motion } from "motion/react";
import { Check, Sparkles, Zap, ShieldAlert, ShieldCheck, Loader2, Award, Tag } from "lucide-react";
import PaymentModal from "./PaymentModal";

interface PricingProps {
  currentUser: any;
  onOpenAuth: () => void;
  onSuccessPayment: () => void;
}

interface Package {
  id: string;
  packageId?: string;
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

export default function Pricing({ currentUser, onOpenAuth, onSuccessPayment }: PricingProps) {
  const [packagesList, setPackagesList] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    type: string;
    name: string;
    price: number;
    packageId?: string;
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
      // 1. Fetch Pricing Packages from Firestore
      const snap = await getDocs(collection(db, "packages"));
      const pkgs: Package[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive !== false) {
          let fetchedDiscountType: "flat" | "percentage" | "none" = "none";
          if (data.discountType === "percentage") {
            fetchedDiscountType = "percentage";
          } else if (data.discountType === "flat") {
            fetchedDiscountType = "flat";
          }

          pkgs.push({
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
        }
      });

      if (pkgs.length === 0) {
        setPackagesList(DEFAULT_PACKAGES);
      } else {
        pkgs.sort((a, b) => a.baseprice - b.baseprice);
        setPackagesList(pkgs);
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
                validUntil: until.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" }),
                type: uData.subscriptionType 
                  ? String(uData.subscriptionType).toUpperCase() + " Premium" 
                  : "Premium"
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading pricing/subscription info:", err);
      setPackagesList(DEFAULT_PACKAGES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingAndUserSubscription();
  }, [currentUser]);

  const handleSelectPlan = (type: string, name: string, price: number, packageId?: string) => {
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

    setSelectedPlan({ type, name, price, packageId });
    setIsPaymentOpen(true);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {packagesList.map((pkg) => {
          const finalPrice = getDiscountedPrice(pkg);
          const isHighlighted = pkg.isHighlighted === true;
          const isYearly = pkg.packagetype === "yearly";

          return (
            <motion.div
              key={pkg.id}
              whileHover={{ y: -4 }}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between border ${
                isHighlighted 
                  ? "border-2 border-indigo-600 dark:border-indigo-500 shadow-md" 
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {isHighlighted && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white font-extrabold text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                  Best Value • সাশ্রয়ী
                </div>
              )}

              {pkg.discountType !== "none" && pkg.discountValue > 0 && (
                <div className="absolute top-0 left-0 bg-rose-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-br-2xl shadow-sm flex items-center gap-1 z-10 animate-pulse">
                  <Tag className="w-3 h-3" />
                  <span>{pkg.discountType === "flat" ? `${pkg.discountValue}৳ ছাড়!` : `${pkg.discountValue}% ছাড়!`}</span>
                </div>
              )}

              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg inline-block ${
                    isHighlighted 
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20" 
                      : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20"
                  }`}>
                    {pkg.packagetype} Package
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{pkg.packageTitle}</h3>
                  <p className="text-xs text-slate-400">{pkg.packageSubtitle}</p>
                </div>

                {/* Price block */}
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${isHighlighted ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
                    {finalPrice} ৳
                  </span>
                  {pkg.discountType !== "none" && pkg.discountValue > 0 && (
                    <>
                      <span className="text-sm text-slate-400 line-through font-medium">{pkg.baseprice} ৳</span>
                      <span className="text-[10px] text-rose-600 font-extrabold">
                        ({pkg.discountType === "flat" ? `${pkg.discountValue} ৳ ছাড়` : `${pkg.discountValue}% ছাড়`})
                      </span>
                    </>
                  )}
                </div>

                <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800" />

                <ul className="space-y-3.5 text-xs">
                  {pkg.discription.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Dynamic Validity Badge inside Package Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl flex items-center justify-between text-xs mt-4">
                  <span className="text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">মেয়াদ (Validity):</span>
                  <span className="font-black text-slate-700 dark:text-slate-300">
                    {pkg.validityDays || 0} দিন {pkg.validityHours || 0} ঘণ্টা {pkg.validityMins || 0} মিনিট
                  </span>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => handleSelectPlan(`premium_${pkg.packagetype}`, `${pkg.packageTitle} Membership`, finalPrice, pkg.id)}
                  disabled={subscriptionStatus.isPremium}
                  className={`w-full py-3.5 px-4 font-black text-xs rounded-2xl cursor-pointer transition-all shadow-md ${
                    subscriptionStatus.isPremium
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none"
                      : isHighlighted
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 dark:shadow-none hover:shadow-lg hover:shadow-indigo-200"
                      : "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-blue-100 dark:shadow-none"
                  }`}
                >
                  {subscriptionStatus.isPremium ? "ইতিমধ্যে প্রিমিয়াম মেম্বার" : `${pkg.packageTitle} নিন`}
                </button>
              </div>
            </motion.div>
          );
        })}
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
          productId={selectedPlan.packageId || selectedPlan.type}
          onSuccess={() => {
            onSuccessPayment();
          }}
        />
      )}
    </div>
  );
}
