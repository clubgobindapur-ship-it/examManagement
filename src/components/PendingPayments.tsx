import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { CheckCircle2, XCircle, ShieldAlert, RefreshCw, Clock, Search, ExternalLink, Filter } from "lucide-react";

interface Transaction {
  id: string;
  userId: string;
  username: string;
  email: string;
  examId: string;
  examName: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  senderNumber?: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  type: "exam" | "premium_monthly" | "premium_yearly" | string;
  verifiedAt?: string;
  packageId?: string;
}

export default function PendingPayments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{
    tx: Transaction;
    action: "verify" | "reject";
  } | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    trackEvent("admin_load_transactions_start");
    try {
      const snap = await getDocs(collection(db, "transactions"));
      const list: Transaction[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId || "",
          username: data.username || "Unknown",
          email: data.email || "",
          examId: data.examId || "",
          examName: data.examName || "Unknown",
          amount: Number(data.amount) || 0,
          paymentMethod: data.paymentMethod || "bKash",
          transactionId: data.transactionId || "",
          senderNumber: data.senderNumber || "N/A",
          status: data.status || "pending",
          createdAt: data.createdAt || "",
          type: data.type || "exam",
          verifiedAt: data.verifiedAt || undefined,
          packageId: data.packageId || ""
        });
      });

      // Sort by newest first
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setTransactions(list);
      trackEvent("admin_load_transactions_success", { count: list.length });
    } catch (err: any) {
      console.error(err);
      setError("পেমেন্ট ট্রানজেকশন তালিকা লোড করতে ব্যর্থ হয়েছে।");
      trackEvent("admin_load_transactions_failure", { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleVerify = async (tx: Transaction) => {
    setProcessingId(tx.id);
    setError("");
    setSuccess("");
    trackEvent("admin_verify_payment_start", { txId: tx.id, userId: tx.userId });

    try {
      const verifiedAt = new Date().toISOString();

      // 1. Update Transaction status in global transactions collection
      const txRef = doc(db, "transactions", tx.id);
      await updateDoc(txRef, {
        status: "verified",
        isVerified: true,
        verifiedAt
      });

      // 2. Grant access based on purchase type
      if (tx.type === "exam") {
        // Individual exam subscription update
        const subRef = doc(db, "users", tx.userId, "subscriptions", tx.examId);
        await setDoc(subRef, {
          examId: tx.examId,
          examName: tx.examName,
          status: "verified",
          isVerified: true,
          transactionId: tx.transactionId,
          paymentMethod: tx.paymentMethod,
          price: tx.amount,
          verifiedAt
        }, { merge: true });
      } else if (tx.type && tx.type.startsWith("premium_")) {
        // Global premium status update in users collection
        let validityDays = 30;
        let validityHours = 0;
        let validityMins = 0;
        let subType = tx.type.replace("premium_", "");

        // Try to fetch the package to get dynamic validity
        try {
          const packId = tx.packageId || tx.examId || tx.type; // fallbacks
          if (packId) {
            const packSnap = await getDoc(doc(db, "packages", packId));
            if (packSnap.exists()) {
              const packData = packSnap.data();
              validityDays = packData.validityDays !== undefined ? Number(packData.validityDays) : 0;
              validityHours = packData.validityHours !== undefined ? Number(packData.validityHours) : 0;
              validityMins = packData.validityMins !== undefined ? Number(packData.validityMins) : 0;
              subType = packData.packagetype || subType;
            } else {
              // Try to search by packagetype
              const cleanType = tx.type.replace("premium_", "");
              const pkgsSnap = await getDocs(collection(db, "packages"));
              let matchedPack: any = null;
              pkgsSnap.forEach((d) => {
                if (d.data().packagetype === cleanType) {
                  matchedPack = d.data();
                }
              });
              if (matchedPack) {
                validityDays = matchedPack.validityDays !== undefined ? Number(matchedPack.validityDays) : 0;
                validityHours = matchedPack.validityHours !== undefined ? Number(matchedPack.validityHours) : 0;
                validityMins = matchedPack.validityMins !== undefined ? Number(matchedPack.validityMins) : 0;
                subType = matchedPack.packagetype || subType;
              } else {
                // Hardcoded fallback if package not found anywhere
                if (tx.type === "premium_weekly") {
                  validityDays = 7;
                  subType = "weekly";
                } else if (tx.type === "premium_yearly") {
                  validityDays = 365;
                  subType = "yearly";
                } else if (tx.type === "premium_half_yearly") {
                  validityDays = 182;
                  subType = "half_yearly";
                } else {
                  validityDays = 30;
                  subType = "monthly";
                }
              }
            }
          }
        } catch (packErr) {
          console.error("Error loading package validity:", packErr);
        }

        // Check if user already has any subscriptionsList to append to
        let existingList: any[] = [];
        try {
          const userSnap = await getDoc(doc(db, "users", tx.userId));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            existingList = Array.isArray(uData.subscriptionsList) ? uData.subscriptionsList : [];
          }
        } catch (userErr) {
          console.error("Error fetching user active subscriptions:", userErr);
        }

        // Calculate target expiration date by adding dynamic validity to CURRENT time
        // Requirement 3: updated premiumUntil will be current + purchases pack validity
        const startDate = new Date(); 
        const targetDate = new Date(startDate.getTime());
        if (validityDays > 0) targetDate.setDate(targetDate.getDate() + validityDays);
        if (validityHours > 0) targetDate.setHours(targetDate.getHours() + validityHours);
        if (validityMins > 0) targetDate.setMinutes(targetDate.getMinutes() + validityMins);

        const packId = tx.packageId || tx.examId || tx.type || "premium_custom";

        const newSubscriptionItem = {
          packageId: packId,
          packageName: tx.examName || `${subType.toUpperCase()} Premium Package`,
          activatedAt: startDate.toISOString(),
          premiumUntil: targetDate.toISOString(),
          validityDays,
          validityHours,
          validityMins
        };

        const updatedList = [...existingList, newSubscriptionItem];

        const userRef = doc(db, "users", tx.userId);
        await setDoc(userRef, {
          premiumUntil: targetDate.toISOString(),
          subscriptionType: subType,
          packageId: packId, // store subscription using packageId
          subscriptionsList: updatedList // every user might have a subscription list
        }, { merge: true });
      }

      // Automation: when a transaction is verified, add an automated notice for this user
      try {
        const autoNoticeId = `${tx.id}-activation`;
        const calculatedSubType = tx.type && tx.type.startsWith("premium_") ? tx.type.replace("premium_", "") : "";
        const friendlyPackageName = tx.examName || (calculatedSubType === "monthly" ? "মাসিক প্রিমিয়াম প্যাকেজ" : calculatedSubType === "yearly" ? "বার্ষিক প্রিমিয়াম প্যাকেজ" : "প্রিমিয়াম প্যাকেজ");
        const autoNoticeText = `অভিনন্দন! আপনার পেমেন্ট ট্রানজেকশনটি (TxID: ${tx.transactionId || tx.id}) সফলভাবে যাচাই করা হয়েছে। আপনার কাঙ্ক্ষিত '${friendlyPackageName}' এখন সক্রিয়! আপনি কুইজ পোর্টালের সমস্ত প্রিমিয়াম কন্টেন্ট ও ফিচারগুলো পুরোপুরি উপভোগ করতে পারবেন। শুভকামনা আপনার পরীক্ষা প্রস্তুতির জন্য!`;
        
        await setDoc(doc(db, "notices", autoNoticeId), {
          noticeText: autoNoticeText,
          user: tx.userId,
          isLive: true,
          deeplink: "live",
          createdAt: new Date().toISOString()
        }, { merge: true });
        console.log("Automated activation notice created successfully for user:", tx.userId);
      } catch (noticeAutoErr) {
        console.error("Failed to create automated notice:", noticeAutoErr);
      }

      setSuccess("পেমেন্ট সফলভাবে ভেরিফাই করা হয়েছে!");
      trackEvent("admin_verify_payment_success", { txId: tx.id, type: tx.type });
      
      // Update local state
      setTransactions((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, status: "verified", verifiedAt } : t))
      );
    } catch (err: any) {
      console.error(err);
      setError("পেমেন্ট ভেরিফাই করতে সমস্যা হয়েছে: " + err.message);
      trackEvent("admin_verify_payment_failure", { txId: tx.id, error: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (tx: Transaction) => {
    setProcessingId(tx.id);
    setError("");
    setSuccess("");
    trackEvent("admin_reject_payment_start", { txId: tx.id });

    try {
      const rejectedAt = new Date().toISOString();

      // 1. Update Transaction status in global transactions collection
      const txRef = doc(db, "transactions", tx.id);
      await updateDoc(txRef, {
        status: "rejected",
        isVerified: false,
        rejectedAt
      });

      // 2. Update subscription subcollection if it was an exam purchase
      if (tx.type === "exam") {
        const subRef = doc(db, "users", tx.userId, "subscriptions", tx.examId);
        await setDoc(subRef, {
          status: "rejected",
          isVerified: false,
          rejectedAt
        }, { merge: true });
      }

      setSuccess("পেমেন্ট রিকোয়েস্টটি সফলভাবে রিজেক্ট করা হয়েছে।");
      trackEvent("admin_reject_payment_success", { txId: tx.id });
      
      // Update local state
      setTransactions((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, status: "rejected" } : t))
      );
    } catch (err: any) {
      console.error(err);
      setError("পেমেন্ট রিজেক্ট করতে সমস্যা হয়েছে: " + err.message);
      trackEvent("admin_reject_payment_failure", { txId: tx.id, error: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTx = transactions.filter((tx) => {
    const matchesSearch =
      tx.username.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      tx.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      tx.transactionId.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      tx.examName.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchesStatus = statusFilter === "all" ? true : tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-violet-700 to-fuchsia-800 text-white p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-fuchsia-200" />
            <div>
              <h2 className="text-xl font-bold font-sans">Pending & Recent Payments</h2>
              <p className="text-xs text-fuchsia-100 mt-1">
                পরীক্ষার্থীদের পাঠানো বিকাশ ও নগদ ম্যানুয়াল পেমেন্ট ভেরিফাই করুন এবং প্রিমিয়াম অ্যাক্সেস অনুমোদন করুন।
              </p>
            </div>
          </div>
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-white transition-all flex items-center gap-1.5 text-xs font-bold font-sans cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ইউজারনেম, ইমেইল বা ট্রানজেকশন আইডি দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Status Tab Filter */}
        <div className="flex gap-1 bg-slate-150 p-1 rounded-xl w-full">
          {(["pending", "verified", "rejected", "all"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {status === "pending" && "Pending (অপেক্ষমান)"}
              {status === "verified" && "Verified (অনুমোদিত)"}
              {status === "rejected" && "Rejected (বাতিল)"}
              {status === "all" && "All (সব)"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
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

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-semibold">পেমেন্ট হিস্ট্রি লোড হচ্ছে...</p>
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white space-y-2">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">কোনো পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              এই ক্যাটাগরিতে বর্তমানে কোনো ম্যানুয়াল পেমেন্ট ট্রানজেকশন পেন্ডিং বা সংরক্ষিত নেই।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-4">User Info</th>
                  <th className="px-5 py-4">Product Info</th>
                  <th className="px-5 py-4">Transaction Details</th>
                  <th className="px-5 py-4">Submitted Date</th>
                  <th className="px-5 py-4">Status</th>
                  {statusFilter === "pending" && <th className="px-5 py-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{tx.username}</span>
                        <span className="text-slate-400 text-[10px] block mt-0.5 font-sans">{tx.email}</span>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{tx.examName}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] uppercase font-black tracking-wide mt-1 inline-block">
                          {tx.type === "exam" ? "Single Exam" : tx.type.startsWith("premium_") ? tx.type.replace("premium_", "").replace("_", " ").toUpperCase() + " Premium" : "Subscription"}
                        </span>
                      </div>
                    </td>

                    {/* Txn Details */}
                    <td className="px-5 py-4 space-y-1 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.paymentMethod === "bKash" ? "bg-pink-100 text-pink-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {tx.paymentMethod}
                        </span>
                        <span className="font-extrabold text-blue-600 text-xs select-all bg-blue-50 px-1 py-0.5 rounded">{tx.transactionId}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Sender: <b className="font-mono text-slate-700">{tx.senderNumber || "N/A"}</b> | Amount: <b className="text-emerald-650 font-sans">{tx.amount} ৳</b>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-mono">
                        {tx.createdAt 
                          ? new Date(tx.createdAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "N/A"
                        }
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        tx.status === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : tx.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {tx.status === "verified" && "verified"}
                        {tx.status === "rejected" && "rejected"}
                        {tx.status === "pending" && "pending"}
                      </span>
                    </td>

                    {/* Actions */}
                    {statusFilter === "pending" && (
                      <td className="px-5 py-4 text-center">
                        {processingId === tx.id ? (
                          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setConfirmingAction({ tx, action: "verify" })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => setConfirmingAction({ tx, action: "reject" })}
                              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-150 dark:border-slate-800 text-center space-y-4">
            <div className="flex justify-center">
              {confirmingAction.action === "verify" ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
              ) : (
                <XCircle className="w-12 h-12 text-rose-500 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {confirmingAction.action === "verify" ? "Confirm Payment Verification" : "Reject Payment Request"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {confirmingAction.action === "verify" 
                  ? `Are you sure you want to verify the payment of ${confirmingAction.tx.amount} BDT from "${confirmingAction.tx.username}"?` 
                  : `Are you sure you want to reject the payment request from "${confirmingAction.tx.username}"?`}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setConfirmingAction(null)}
                className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { tx, action } = confirmingAction;
                  setConfirmingAction(null);
                  if (action === "verify") {
                    await handleVerify(tx);
                  } else {
                    await handleReject(tx);
                  }
                }}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition-all cursor-pointer ${
                  confirmingAction.action === "verify" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {confirmingAction.action === "verify" ? "Yes, Verify" : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
