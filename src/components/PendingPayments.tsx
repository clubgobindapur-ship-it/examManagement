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
  type: "exam" | "premium_monthly" | "premium_yearly";
  verifiedAt?: string;
}

export default function PendingPayments() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

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
          verifiedAt: data.verifiedAt || undefined
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
    if (!window.confirm(`আপনি কি "${tx.username}" এর ${tx.amount} টাকার পেমেন্টটি ভেরিফাই করতে চান?`)) {
      return;
    }

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
      } else if (tx.type === "premium_monthly" || tx.type === "premium_yearly") {
        // Global premium status update in users collection
        const daysToAdd = tx.type === "premium_monthly" ? 30 : 365;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysToAdd);

        const userRef = doc(db, "users", tx.userId);
        await setDoc(userRef, {
          premiumUntil: targetDate.toISOString(),
          subscriptionType: tx.type === "premium_monthly" ? "monthly" : "yearly"
        }, { merge: true });
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
    if (!window.confirm(`আপনি কি "${tx.username}" এর পেমেন্টটি বাতিল/রিজেক্ট করতে চান?`)) {
      return;
    }

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
        await updateDoc(subRef, {
          status: "rejected",
          isVerified: false,
          rejectedAt
        });
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
                          {tx.type === "exam" ? "Single Exam" : tx.type === "premium_monthly" ? "Monthly Premium" : "Yearly Premium"}
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
                              onClick={() => handleVerify(tx)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => handleReject(tx)}
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
    </div>
  );
}
