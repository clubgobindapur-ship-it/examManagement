import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { ChevronLeft, ChevronRight, ArrowRight, RefreshCw, Megaphone } from "lucide-react";

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

export default function AdCarousel() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAds = async () => {
      try {
        const docRef = doc(db, "settings", "carousel");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ads && Array.isArray(data.ads) && data.ads.length > 0) {
            setAds(data.ads);
            trackEvent("carousel_load_ads_success", { count: data.ads.length });
            setLoading(false);
            return;
          }
        }
        
        // Fallback placeholder/default ads if firestore has no configuration yet
        const defaultAds: Ad[] = [
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
        setAds(defaultAds);
        trackEvent("carousel_load_ads_fallback", { count: defaultAds.length });
      } catch (err) {
        console.warn("Could not load carousel ads from Firestore, using placeholder local array", err);
      } finally {
        setLoading(false);
      }
    };
    loadAds();
  }, []);

  // Slide interval auto transition
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [ads.length]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (ads.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % ads.length);
    trackEvent("carousel_next_click", { index: (currentIndex + 1) % ads.length });
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (ads.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
    trackEvent("carousel_prev_click", { index: (currentIndex - 1 + ads.length) % ads.length });
  };

  const handleAdClick = (ad: Ad) => {
    trackEvent("ad_click", {
      adId: ad.id,
      type: ad.type,
      title: ad.title || "Image Banner",
      redirectionUrl: ad.redirectionUrl || "none"
    });
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 h-[180px] bg-white flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-xs font-bold text-slate-400 font-mono">Loading Promotion Banners...</span>
      </div>
    );
  }

  if (ads.length === 0) {
    return null; // Don't render anything if there are no ads
  }

  const activeAd = ads[currentIndex];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 h-[220px] sm:h-[180px] bg-slate-900 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -25 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 w-full h-full"
        >
          {activeAd.type === "image" ? (
            // Image Type: ONLY the image will be shown. Nothing else added on top.
            activeAd.redirectionUrl ? (
              <a
                href={activeAd.redirectionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleAdClick(activeAd)}
                className="absolute inset-0 block w-full h-full cursor-pointer overflow-hidden"
              >
                <img
                  src={activeAd.imageUrl}
                  alt="Promotion Banner"
                  className="w-full h-full object-cover hover:scale-102 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </a>
            ) : (
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <img
                  src={activeAd.imageUrl}
                  alt="Promotion Banner"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )
          ) : (
            // Text Type: badge, title, description, button (CTA)
            <div className="absolute inset-0 w-full h-full relative overflow-hidden flex items-center">
              {/* Background cover image */}
              <img
                src={activeAd.imageUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-xs"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950/40" />

              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-center text-white z-10 max-w-2xl space-y-2 sm:space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/90 text-[10px] font-black uppercase tracking-wider text-white border border-blue-500/30">
                    <Megaphone className="w-3 h-3 text-yellow-300" />
                    {activeAd.badge}
                  </span>
                </div>
                
                <h3 className="text-base sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  {activeAd.title}
                </h3>
                
                <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed line-clamp-2 max-w-xl">
                  {activeAd.description}
                </p>

                {/* CTA Button */}
                <div className="pt-1">
                  {activeAd.redirectionUrl ? (
                    <a
                      href={activeAd.redirectionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleAdClick(activeAd)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all"
                    >
                      <span>{activeAd.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleAdClick(activeAd)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all"
                    >
                      <span>{activeAd.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Buttons */}
      {ads.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/25 text-white/70 hover:text-white hover:bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/25 text-white/70 hover:text-white hover:bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 right-6 flex items-center gap-1.5 z-20">
            {ads.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  trackEvent("carousel_dot_click", { index: idx });
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
