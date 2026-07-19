import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { Users, Search, RefreshCw, Calendar, Trash2, Award, Mail, Phone, UserCheck, ShieldAlert } from "lucide-react";

interface UserProfile {
  uid: string;
  username: string;
  email: string;
  phone?: string;
  gender?: string;
  studyLevel?: string;
  jobPreferences?: string[];
  createdAt?: string;
}

export default function UserManagement() {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [studyLevelFilter, setStudyLevelFilter] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    trackEvent("admin_load_users_start");
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          uid: docSnap.id,
          username: data.username || "Unknown",
          email: data.email || "",
          phone: data.phone || "",
          gender: data.gender || "",
          studyLevel: data.studyLevel || "",
          jobPreferences: data.jobPreferences || [],
          createdAt: data.createdAt || ""
        });
      });
      
      // Sort by newest registered
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setUsersList(list);
      trackEvent("admin_load_users_success", { count: list.length });
    } catch (err: any) {
      console.error(err);
      setError("ব্যবহারকারী তালিকা লোড করতে ব্যর্থ হয়েছে।");
      trackEvent("admin_load_users_failure", { error: err.message });
      try {
        handleFirestoreError(err, OperationType.LIST, "users");
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (uid: string, username: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${username}" কে মুছে ফেলতে চান?`)) {
      trackEvent("admin_delete_user_cancelled", { uid, username });
      return;
    }

    trackEvent("admin_delete_user_start", { uid, username });
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsersList((prev) => prev.filter((u) => u.uid !== uid));
      trackEvent("admin_delete_user_success", { uid, username });
    } catch (err: any) {
      console.error(err);
      alert("ব্যবহারকারী মুছে ফেলতে ব্যর্থ হয়েছে।");
      trackEvent("admin_delete_user_failure", { uid, username, error: err.message });
    }
  };

  // Filter list
  const filteredUsers = usersList.filter((user) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.phone && user.phone.includes(query));
    
    const matchesGender = genderFilter ? user.gender === genderFilter : true;
    const matchesStudyLevel = studyLevelFilter ? user.studyLevel === studyLevelFilter : true;

    return matchesSearch && matchesGender && matchesStudyLevel;
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    trackEvent("admin_user_search", { query: val });
  };

  const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setGenderFilter(val);
    trackEvent("admin_user_filter_gender", { gender: val });
  };

  const handleStudyLevelFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStudyLevelFilter(val);
    trackEvent("admin_user_filter_studylevel", { studyLevel: val });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-200" />
            <div>
              <h2 className="text-xl font-bold font-sans">User Management</h2>
              <p className="text-xs text-indigo-100 mt-1">
                পোর্টালে নিবন্ধিত সকল পরীক্ষার্থীদের বিবরণ, পড়াশোনার স্তর ও জব প্রেফারেন্স দেখুন।
              </p>
            </div>
          </div>
          <button 
            onClick={loadUsers}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-white transition-all flex items-center gap-1.5 text-xs font-bold font-sans cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Gender Filter */}
        <div>
          <select
            value={genderFilter}
            onChange={handleGenderFilterChange}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            <option value="">সকল জেন্ডার (All Genders)</option>
            <option value="male">পুরুষ (Male)</option>
            <option value="female">নারী (Female)</option>
            <option value="other">অন্যান্য (Other)</option>
          </select>
        </div>

        {/* Study Level Filter */}
        <div>
          <select
            value={studyLevelFilter}
            onChange={handleStudyLevelFilterChange}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          >
            <option value="">সকল শিক্ষাগত স্তর (All Study Levels)</option>
            <option value="hsc">এইচএসসি / সমমান (HSC/Equivalent)</option>
            <option value="undergraduate">অনার্স / ডিগ্রি (Undergraduate)</option>
            <option value="postgraduate">মাস্টার্স / স্নাতকোত্তর (Postgraduate)</option>
            <option value="completed">শিক্ষা জীবন সমাপ্ত (Completed)</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-semibold font-sans">নিবন্ধিত ব্যবহারকারী লোড করা হচ্ছে...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">কোনো ব্যবহারকারী পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              আপনার ফিল্টার অথবা সার্চ কুয়েরি পরিবর্তন করে পুনরায় চেষ্টা করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[13px] uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-4 font-sans">Candidate</th>
                  <th className="px-5 py-4 font-sans">Contact Details</th>
                  <th className="px-5 py-4 font-sans">Study & Preferences</th>
                  <th className="px-5 py-4 font-sans">Joined Date</th>
                  <th className="px-5 py-4 font-sans text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    {/* User profile details */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center uppercase shrink-0 text-xs">
                          {user.username ? user.username[0] : "?"}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs leading-tight">
                            {user.username}
                          </span>
                          <span className="text-[12px] text-slate-400 uppercase font-extrabold tracking-wider block mt-0.5">
                            ID: {user.uid.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email and Phone */}
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px] font-medium font-sans">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-medium">{user.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Study and Job preference */}
                    <td className="px-5 py-4 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[12px] font-bold">
                          {user.studyLevel === "hsc" && "HSC / সমমান"}
                          {user.studyLevel === "undergraduate" && "অনার্স / ডিগ্রি"}
                          {user.studyLevel === "postgraduate" && "মাস্টার্স / স্নাতকোত্তর"}
                          {user.studyLevel === "completed" && "শিক্ষা জীবন সমাপ্ত"}
                          {!user.studyLevel && "Not Specified"}
                        </span>
                        {user.gender && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[12px] font-bold capitalize">
                            {user.gender === "male" && "পুরুষ"}
                            {user.gender === "female" && "নারী"}
                            {user.gender === "other" && "অন্যান্য"}
                          </span>
                        )}
                      </div>
                      {user.jobPreferences && user.jobPreferences.length > 0 && (
                        <div className="text-[12px] text-slate-400 font-semibold truncate max-w-[200px]">
                          জব: {user.jobPreferences.join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[13px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {user.createdAt 
                            ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) 
                            : "N/A"
                          }
                        </span>
                      </div>
                    </td>

                    {/* Delete Action */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(user.uid, user.username)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
