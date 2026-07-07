import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { trackEvent } from "../lib/analytics";
import { ChevronLeft, ChevronRight, Award, Sparkles, BookOpen, ArrowRight } from "lucide-react";

interface AdSlide {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  gradient: string;
  icon: React.ReactNode;
  imageUrl?: string;
  redirectionUrl?: string;
}

export default function AdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dynamicAd, setDynamicAd] = useState<{ imageUrl: string; redirectionUrl: string } | null>(null);

  // Load dynamic ad banner from Firestore
  useEffect(() => {
    const loadPromo = async () => {
      try {
        const docRef = doc(db, "settings", "promotion");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.home && data.home.imageUrl) {
            setDynamicAd({
              imageUrl: data.home.imageUrl,
              redirectionUrl: data.home.redirectionUrl || "https://google.com"
            });
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic ad from Firestore.", err);
      }
    };
    loadPromo();
  }, []);

  const defaultSlides: AdSlide[] = [
    {
      id: 1,
      badge: "স্পেশাল অফার",
      title: "বিসিএস প্রিলিমিনারি কুইজ প্যাক ২০২৬",
      subtitle: "স্পেশাল ৫০% ছাড়ে আজই আমাদের মেম্বারশিপে জয়েন করুন এবং ১০,০০০+ বাছাইকৃত প্রশ্ন ও ব্যাখ্যাসহ সমাধান আনলক করুন!",
      cta: "অফারটি লুফে নিন",
      gradient: "from-blue-600 via-indigo-600 to-violet-700",
      icon: <Award className="w-10 h-10 text-yellow-300" />
    },
    {
      id: 2,
      badge: "ফ্রি লাইভ মক টেস্ট",
      title: "প্রাইমারি শিক্ষক নিয়োগ মেগা লাইভ এক্সাম",
      subtitle: "আগামী ১০ই জুলাই অনুষ্ঠিতব্য ফ্রি অল-বাংলাদেশ মেগা মক টেস্টে অংশ নিয়ে হাজারো পরীক্ষার্থীর মাঝে নিজের র‍্যাংক যাচাই করুন।",
      cta: "রুটিন দেখুন",
      gradient: "from-emerald-600 via-teal-600 to-cyan-700",
      icon: <Sparkles className="w-10 h-10 text-emerald-200" />
    },
    {
      id: 3,
      badge: "নতুন ফিচার",
      title: "স্মার্ট অ্যানালিটিক্স ও অগ্রগতি ট্র্যাকার",
      subtitle: "এখন কুইজে অংশ নিলেই পাচ্ছেন আপনার সঠিক ও ভুল উত্তরসমূহের অগ্রগতি রিপোর্ট। নিজের দুর্বলতা কাটিয়ে উঠুন সহজে!",
      cta: "অগ্রগতি দেখুন",
      gradient: "from-slate-800 via-slate-900 to-slate-950",
      icon: <BookOpen className="w-10 h-10 text-indigo-300" />
    }
  ];

  // If dynamic ad is configured in settings database, inject it as the first slide
  const slides: AdSlide[] = dynamicAd 
    ? [
        {
          id: 99,
          badge: "প্রোমোশন (Sponsored)",
          title: "বিশেষ পার্টনার অফার",
          subtitle: "আমাদের স্পনসরড অফারটি দেখতে এবং আকর্ষনীয় সুযোগ উপভোগ করতে ব্যানারে ক্লিক করুন!",
          cta: "অফারটি দেখুন",
          gradient: "from-indigo-950 to-slate-900",
          icon: <Sparkles className="w-10 h-10 text-yellow-300" />,
          imageUrl: dynamicAd.imageUrl,
          redirectionUrl: dynamicAd.redirectionUrl
        },
        ...defaultSlides
      ]
    : defaultSlides;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleAdClick = (slide: AdSlide) => {
    trackEvent("ad_click", {
      adId: slide.id,
      title: slide.title,
      imageUrl: slide.imageUrl || "none",
      redirectionUrl: slide.redirectionUrl || "none"
    });
  };

  const activeSlide = slides[currentIndex];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200 h-[220px] sm:h-[180px] bg-slate-100 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 w-full h-full"
        >
          {activeSlide.imageUrl ? (
            <a
              href={activeSlide.redirectionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleAdClick(activeSlide)}
              className="absolute inset-0 block w-full h-full cursor-pointer overflow-hidden"
            >
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.title}
                className="w-full h-full object-cover hover:scale-103 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 p-6 sm:p-8 flex flex-col justify-end text-white">
                <div className="space-y-1.5 sm:space-y-2 max-w-[85%]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    {activeSlide.badge}
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                    {activeSlide.title}
                  </h3>
                  <p className="text-xs text-white/90 leading-relaxed line-clamp-2 max-w-2xl font-medium">
                    {activeSlide.subtitle}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 hidden sm:flex px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all gap-1.5 items-center">
                <span>{activeSlide.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </a>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r ${activeSlide.gradient} p-6 sm:p-8 flex items-center justify-between gap-6 text-white`}>
              <div className="space-y-2 sm:space-y-3 max-w-[75%] z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-slate-100 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  {activeSlide.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white line-clamp-1 leading-tight">
                  {activeSlide.title}
                </h3>
                <p className="text-xs text-white/85 font-medium leading-relaxed line-clamp-2 max-w-xl">
                  {activeSlide.subtitle}
                </p>
                <div className="pt-1.5">
                  <button 
                    onClick={() => handleAdClick(activeSlide)}
                    className="px-3.5 py-1.5 bg-white text-slate-900 font-bold text-[11px] rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{activeSlide.cta}</span>
                    <ArrowRight className="w-3 h-3 text-slate-700" />
                  </button>
                </div>
              </div>

              <div className="hidden md:flex bg-white/10 p-4 rounded-2xl border border-white/5 shadow-inner shrink-0 items-center justify-center">
                {activeSlide.icon}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/15 text-white/70 hover:text-white hover:bg-black/30 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/15 text-white/70 hover:text-white hover:bg-black/30 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
