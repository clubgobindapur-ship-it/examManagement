import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { trackEvent } from "../lib/analytics";
import { motion, AnimatePresence } from "motion/react";
import { X, Smartphone, CreditCard, CheckCircle2, ShieldAlert, Loader2, Send } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  paymentType: "exam" | "premium_monthly" | "premium_yearly" | string;
  price: number;
  productName: string;
  productId: string; // exam.id or "premium_monthly" or "premium_yearly"
  onSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  currentUser,
  paymentType,
  price,
  productName,
  productId,
  onSuccess
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad">("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  if (!isOpen) return null;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!transactionId.trim()) {
      setError("ট্রানজেকশন আইডি (Transaction ID) প্রদান করা আবশ্যক।");
      return;
    }

    if (transactionId.trim().length < 6) {
      setError("অনুগ্রহ করে একটি সঠিক ট্রানজেকশন আইডি প্রদান করুন।");
      return;
    }

    setIsSubmitting(true);
    trackEvent("submit_payment_start", { paymentType, productId, price, paymentMethod });

    try {
      const txIdClean = transactionId.trim().toUpperCase();
      const userCleanId = currentUser.uid;
      const username = currentUser.displayName || currentUser.email.split("@")[0] || "User";
      const email = currentUser.email || "";

      // 1. Create a transaction record in firestore
      const txData = {
        userId: userCleanId,
        username,
        email,
        examId: paymentType === "exam" ? productId : "premium",
        packageId: paymentType === "exam" ? "" : productId,
        examName: productName,
        amount: price,
        paymentMethod,
        transactionId: txIdClean,
        senderNumber: phoneNumber.trim() || "N/A",
        status: "pending",
        isVerified: false,
        createdAt: new Date().toISOString(),
        type: paymentType,
        updatedAt: new Date().toISOString()
      };

      // Create transaction document
      const txRef = doc(collection(db, "transactions"));
      await setDoc(txRef, txData);

      // 2. If it's a per-exam subscription, create a pending subscription for the user
      if (paymentType === "exam") {
        const subRef = doc(db, "users", userCleanId, "subscriptions", productId);
        await setDoc(subRef, {
          examId: productId,
          examName: productName,
          status: "pending",
          isVerified: false,
          transactionId: txIdClean,
          paymentMethod,
          price,
          updatedAt: new Date().toISOString()
        });
      }

      trackEvent("submit_payment_success", { paymentType, productId, txId: txIdClean });
      setStep("success");
    } catch (err: any) {
      console.error("Payment submission failed:", err);
      setError("পেমেন্ট সাবমিট করতে ব্যর্থ হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।");
      trackEvent("submit_payment_failure", { error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  // Mock Admin accounts
  const adminNumbers = {
    bKash: "০১৭৮৯-১২৩৪৫৬ (Personal)",
    Nagad: "০১৮৯৮-৭৬৫ND৩ (Personal)"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-200" />
            <h3 className="text-base font-bold">ম্যানুয়াল পেমেন্ট ভেরিফিকেশন</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="payment_form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-5"
            >
              {/* Product Info Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold text-[9px]">ক্রয়কৃত আইটেম (Item)</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-sm mt-0.5 block">{productName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold text-[9px]">পরিশোধযোগ্য মূল্য (Price)</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-lg mt-0.5 block">{price} ৳</span>
                </div>
              </div>

              {/* Steps/Instructions */}
              <div className="space-y-3.5">
                <span className="text-slate-800 dark:text-slate-200 font-bold text-xs block">পেমেন্ট করার নিয়মাবলী:</span>
                <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside pl-1">
                  <li>
                    নিচের যেকোনো একটি পেমেন্ট মেথড (bKash বা Nagad) নির্বাচন করুন।
                  </li>
                  <li>
                    আমাদের মোবাইল নম্বর <b className="text-slate-800 dark:text-slate-100 font-mono select-all bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">{paymentMethod === "bKash" ? adminNumbers.bKash : adminNumbers.Nagad}</b>-এ <b className="text-blue-600 dark:text-blue-400 font-bold">{price} টাকা</b> "Send Money" করুন।
                  </li>
                  <li>
                    টাকা পাঠানো সফল হলে আপনার bKash/Nagad ট্রানজেকশন আইডি (TxnID) এবং যে নম্বর থেকে পাঠিয়েছেন তা নিচের ফর্মে লিখে সাবমিট করুন।
                  </li>
                </ol>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-bold text-[10px]">পেমেন্ট গেটওয়ে সিলেক্ট করুন</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bKash")}
                    className={`p-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                      paymentMethod === "bKash"
                        ? "bg-pink-50 dark:bg-pink-950/20 border-pink-300 text-pink-700 dark:text-pink-400 shadow-sm"
                        : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>bKash (বিকাশ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Nagad")}
                    className={`p-3 border rounded-xl flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                      paymentMethod === "Nagad"
                        ? "bg-orange-50 dark:bg-orange-950/20 border-orange-300 text-orange-700 dark:text-orange-400 shadow-sm"
                        : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>Nagad (নগদ)</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Form */}
              <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sender phone number */}
                  <div className="space-y-1.5">
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide block">আপনার বিকাশ/নগদ নম্বর (ঐচ্ছিক)</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="যেমন: ০১৭XXXXXXXX"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* Transaction ID */}
                  <div className="space-y-1.5">
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wide block">ট্রানজেকশন আইডি (TxnID) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="যেমন: K8H2F9S7W3"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>প্রসেস করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>পেমেন্ট সাবমিট করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="payment_success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">ধন্যবাদ! পেমেন্ট রিকোয়েস্ট সাবমিট হয়েছে</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  আপনার ট্রানজেকশন আইডি <b className="font-mono text-slate-800 dark:text-slate-200 uppercase bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{transactionId.trim().toUpperCase()}</b> সফলভাবে নথিভুক্ত করা হয়েছে। এডমিন পেমেন্টটি যাচাই করার সাথে সাথে আপনার আইটেমটি সক্রিয় করা হবে।
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 py-2 px-3 rounded-lg max-w-sm mx-auto border border-amber-100/40 mt-3">
                  ⏰ সাধারণত ভেরিফিকেশনে ১০ থেকে ৩০ মিনিট সময় লাগতে পারে। অনুগ্রহ করে ধৈর্য ধরুন।
                </p>
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                ড্যাশবোর্ডে ফিরে যান
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
