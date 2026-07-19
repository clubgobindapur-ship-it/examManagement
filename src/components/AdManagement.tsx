import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { 
  Megaphone, Plus, Trash2, Edit2, Save, X, Sparkles, Image, AlignLeft, ArrowRight, RefreshCw, ShieldAlert, CheckCircle2 
} from "lucide-react";

export interface Ad {
  id: string;
  type: "text" | "image";
  imageUrl: string;
  redirectionUrl?: string;
  badge?: string;
  title?: string;
  description?: string;
  cta?: string;
}

export default function AdManagement() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adType, setAdType] = useState<"text" | "image">("text");
  const [imageUrl, setImageUrl] = useState("");
  const [redirectionUrl, setRedirectionUrl] = useState("");
  const [badge, setBadge] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("");

  // Seed default ads if firestore has no ads
  const seedDefaultAds = async () => {
    const defaults: Ad[] = [
       {
            id: "default-1",
            type: "text",
            badge: "বিসিএস প্রস্তুতি",
            title: "বিসিএস প্রিলিমিনারি Question Bank 10 - 50 Exam",
            description: "বিসিএস প্রিলিমিনারি পরীক্ষার জন্য ১০ থেকে ৫০তম বিসিএসের প্রশ্নের উপর পরীক্ষা নেওয়া হবে। প্রতিটি প্রশ্নের বিস্তারিত সমাধান এবং ব্যাখ্যা সহ।",
            cta: "রুটিন দেখুন",
            imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
            redirectionUrl: "https://facebook.com"
          }
    ];

    try {
      const docRef = doc(db, "settings", "carousel");
      await setDoc(docRef, { ads: defaults });
      setAds(defaults);
      trackEvent("admin_seed_ads_success");
    } catch (e) {
      console.error("Failed to seed default ads", e);
    }
  };

  const loadAds = async () => {
    setLoading(true);
    setError("");
    trackEvent("admin_load_ads_start");
    try {
      const docRef = doc(db, "settings", "carousel");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.ads && Array.isArray(data.ads)) {
          setAds(data.ads);
          trackEvent("admin_load_ads_success", { count: data.ads.length });
        } else {
          // Empty ads array or non-existent
          await seedDefaultAds();
        }
      } else {
        // Document does not exist, seed
        await seedDefaultAds();
      }
    } catch (err: any) {
      console.error(err);
      setError("Carousel Ads লোড করতে ব্যর্থ হয়েছে।");
      trackEvent("admin_load_ads_failure", { error: err.message });
      try {
        handleFirestoreError(err, OperationType.GET, "settings/carousel");
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setAdType("text");
    setImageUrl("");
    setRedirectionUrl("");
    setBadge("");
    setTitle("");
    setDescription("");
    setCta("");
  };

  const handleEditClick = (ad: Ad) => {
    setEditingId(ad.id);
    setAdType(ad.type);
    setImageUrl(ad.imageUrl);
    setRedirectionUrl(ad.redirectionUrl || "");
    setBadge(ad.badge || "");
    setTitle(ad.title || "");
    setDescription(ad.description || "");
    setCta(ad.cta || "");
    trackEvent("admin_ad_edit_click", { adId: ad.id });
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!imageUrl.trim()) {
      setError("Image URL আবশ্যক।");
      return;
    }

    if (adType === "text") {
      if (!title.trim() || !description.trim() || !cta.trim() || !badge.trim()) {
        setError("টেক্সট বিজ্ঞাপনের জন্য ব্যাজ, শিরোনাম, বিবরণ এবং বোতাম টেক্সট আবশ্যক।");
        return;
      }
    }

    setIsSubmitting(true);
    trackEvent("admin_ad_save_start", { editingId, adType });

    try {
      let updatedAdsList = [...ads];
      
      const newAd: Ad = {
        id: editingId || "ad_" + Date.now().toString().slice(-6),
        type: adType,
        imageUrl: imageUrl.trim(),
        redirectionUrl: redirectionUrl.trim() || "",
        ...(adType === "text" ? {
          badge: badge.trim(),
          title: title.trim(),
          description: description.trim(),
          cta: cta.trim()
        } : {})
      };

      if (editingId) {
        // Update existing
        updatedAdsList = updatedAdsList.map(item => item.id === editingId ? newAd : item);
      } else {
        // Add new
        updatedAdsList.push(newAd);
      }

      // Save to Firestore
      const docRef = doc(db, "settings", "carousel");
      await setDoc(docRef, { ads: updatedAdsList });
      
      setAds(updatedAdsList);
      setSuccess(editingId ? "বিজ্ঞাপন সফলভাবে আপডেট করা হয়েছে!" : "নতুন বিজ্ঞাপন সফলভাবে যোগ করা হয়েছে!");
      resetForm();
      trackEvent("admin_ad_save_success", { adId: newAd.id });
    } catch (err: any) {
      console.error(err);
      setError("বিজ্ঞাপন সংরক্ষণ করতে ব্যর্থ হয়েছে: " + err.message);
      trackEvent("admin_ad_save_failure", { error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই বিজ্ঞাপনটি মুছে ফেলতে চান?")) {
      trackEvent("admin_ad_delete_cancelled", { adId: id });
      return;
    }

    trackEvent("admin_ad_delete_start", { adId: id });
    setError("");
    setSuccess("");
    try {
      const updatedAdsList = ads.filter(item => item.id !== id);
      const docRef = doc(db, "settings", "carousel");
      await setDoc(docRef, { ads: updatedAdsList });
      
      setAds(updatedAdsList);
      setSuccess("বিজ্ঞাপনটি সফলভাবে মুছে ফেলা হয়েছে!");
      trackEvent("admin_ad_delete_success", { adId: id });
    } catch (err: any) {
      console.error(err);
      setError("বিজ্ঞাপন মুছে ফেলতে ব্যর্থ হয়েছে।");
      trackEvent("admin_ad_delete_failure", { adId: id, error: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-800 text-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-indigo-200" />
            <div>
              <h2 className="text-xl font-bold font-sans">Ad Carousel Management</h2>
              <p className="text-xs text-indigo-100 mt-1">
                হোমপেজের স্লাইড বিজ্ঞাপনে নতুন টেক্সট বা ইমেজ টাইপের ব্যানার যোগ করুন, পরিমার্জন বা ডিলিট করুন।
              </p>
            </div>
          </div>
          <button 
            onClick={loadAds}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-white transition-all flex items-center gap-1.5 text-xs font-bold font-sans cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>রিফ্রেশ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Ads Form Creator/Editor */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>{editingId ? "Edit Ad Banner" : "Create New Ad Banner"}</span>
            </h3>
            <p className="text-[13px] text-slate-400 mt-1">সবগুলো ফিল্ড সঠিকভাবে পূরণ করে বিজ্ঞাপন তালিকায় সংরক্ষণ করুন।</p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-semibold flex gap-2 items-start">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-semibold flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSaveAd} className="space-y-4 text-xs font-semibold">
            {/* Ad Type Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-500 uppercase tracking-wide">Ad Layout Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdType("text")}
                  className={`py-2 px-3 border rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                    adType === "text"
                      ? "bg-violet-50 border-violet-200 text-violet-700 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                  <span>Text Overlay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdType("image")}
                  className={`py-2 px-3 border rounded-xl flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                    adType === "image"
                      ? "bg-violet-50 border-violet-200 text-violet-700 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Image className="w-4 h-4" />
                  <span>Image Only</span>
                </button>
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <label className="text-slate-500 uppercase tracking-wide block">Image Asset URL</label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/slide-banner.jpg"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Redirection URL */}
            <div className="space-y-1.5">
              <label className="text-slate-500 uppercase tracking-wide block">Redirection / Landing Page URL</label>
              <input
                type="url"
                value={redirectionUrl}
                onChange={(e) => setRedirectionUrl(e.target.value)}
                placeholder="https://example.com/destination-page"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Text Type Only Fields */}
            {adType === "text" && (
              <div className="space-y-4 border-t border-dashed border-slate-100 pt-3">
                {/* Badge */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide block">Badge / Promotion Tag</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="উদা: স্পেশাল অফার"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide block">Banner Headline</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="উদা: প্রাইমারি শিক্ষক নিয়োগ মেগা লাইভ এক্সাম"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide block">Banner Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="বিজ্ঞাপনের সংক্ষিপ্ত বিবরণ লিখুন..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Button CTA */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide block">Button Call-To-Action (CTA) Text</label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="উদা: রুটিন দেখুন"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>বাতিল</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingId ? "আপডেট" : "সংরক্ষণ করুন"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Existing Ads List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Configured Slides ({ads.length})
            </h3>

            {loading ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">লোড হচ্ছে...</p>
              </div>
            ) : ads.length === 0 ? (
              <p className="text-xs text-slate-400 italic">কোনো বিজ্ঞাপন সেট করা নেই।</p>
            ) : (
              <div className="space-y-4">
                {ads.map((ad, idx) => (
                  <div 
                    key={ad.id} 
                    className="border border-slate-100 rounded-xl overflow-hidden hover:shadow-xs transition-all flex flex-col md:flex-row bg-slate-50/50"
                  >
                    {/* Visual Preview Banner preview */}
                    <div className="w-full md:w-44 h-24 bg-slate-200 shrink-0 relative overflow-hidden">
                      <img 
                        src={ad.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=400";
                        }}
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-bold uppercase tracking-wider">
                        #{idx + 1} • {ad.type}
                      </div>
                    </div>

                    {/* Details and Actions */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        {ad.type === "text" ? (
                          <>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 font-bold text-[11px] rounded-md">
                                {ad.badge}
                              </span>
                              {ad.redirectionUrl && (
                                <span className="text-[12px] text-slate-400 truncate max-w-[150px] font-mono">
                                  → {ad.redirectionUrl.replace(/^https?:\/\//i, "")}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 line-clamp-1">{ad.title}</h4>
                            <p className="text-[13px] text-slate-500 line-clamp-1 leading-relaxed">
                              {ad.description}
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold text-[11px] rounded-md inline-block mb-1">
                              Image Banner Layout
                            </span>
                            {ad.redirectionUrl ? (
                              <p className="text-[12px] text-slate-500 font-mono font-medium truncate">
                                Redirection: {ad.redirectionUrl}
                              </p>
                            ) : (
                              <p className="text-[12px] text-slate-400 italic">No redirection link</p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions row */}
                      <div className="flex justify-end items-center gap-1.5 border-t border-slate-100 pt-2 shrink-0">
                        <button
                          onClick={() => handleEditClick(ad)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>এডিট</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>মুছুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
