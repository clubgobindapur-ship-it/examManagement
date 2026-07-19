import React from "react";
import { 
  Phone, Mail, BookOpen, HelpCircle, CheckCircle, 
  ShieldAlert, DollarSign, Award, Info, ExternalLink,
  MessageCircle, ClipboardList, RefreshCw
} from "lucide-react";
import { motion } from "motion/react";
import { trackEvent } from "../lib/analytics";

export default function Helpline() {
  React.useEffect(() => {
    trackEvent("helpline_page_visit");
  }, []);

  const bcsGuides = [
    {
      title: "পরীক্ষা কীভাবে শুরু করবেন?",
      desc: "সক্রিয় পরীক্ষা ট্যাব থেকে আপনার পছন্দের পরীক্ষাটি বেছে নিয়ে 'পরীক্ষা শুরু করুন' বাটনে ক্লিক করুন। অতিথি ব্যবহারকারী হিসেবে শুরু করতে চাইলে শুধু নাম প্রদান করলেই হবে।",
      icon: <BookOpen className="w-5 h-5 text-blue-500" />
    },
    {
      title: "ফলাফল এবং Negative নম্বর",
      desc: "প্রতিটি সঠিক উত্তরের জন্য পাবেন ১ বা নির্দিষ্ট মান এবং ভুল উত্তরের জন্য সাধারণত ০.৫ নম্বর কাটা যাবে। পরীক্ষা সম্পন্ন হওয়ার পর 'ফলাফল' বাটনে ক্লিক করে পূর্ণাঙ্গ সমাধান দেখতে পাবেন।",
      icon: <Award className="w-5 h-5 text-emerald-500" />
    },
    {
      title: "সাবস্ক্রিপশন ও পেইড পরীক্ষা আনলক করা",
      desc: "পেইড পরীক্ষাগুলো আনলক করতে পেমেন্ট করুন। পেমেন্ট করার পর এডমিন আপনার পেমেন্টটি ১-১৫ মিনিটের মধ্যে ভেরিফাই করে পরীক্ষাটি আনলক করে দেবেন। যেকোনো সমস্যায় হেল্পলাইনে যোগাযোগ করুন।",
      icon: <DollarSign className="w-5 h-5 text-amber-500" />
    },
    {
      title: "পুনরায় পরীক্ষা দিন (Retake Option)",
      desc: "আপনি চাইলে যেকোনো পরীক্ষা একাধিকবার দিতে পারবেন। পুনরায় পরীক্ষা দেওয়ার ক্ষেত্রে আগের সর্বোচ্চ প্রাপ্ত স্কোরটি মেধা তালিকায় সংরক্ষিত থাকবে।",
      icon: <RefreshCw className="w-5 h-5 text-indigo-500" />
    }
  ];

  const faqs = [
    {
      q: "পেমেন্ট করার পর পরীক্ষা আনলক হতে কতক্ষণ সময় লাগে?",
      a: "সাধারণত পেমেন্ট সাবমিট করার পর আমাদের সিস্টেম ম্যানুয়ালি বা অটোমেটিক ১-১৫ মিনিটের মধ্যে ভেরিফাই করে পরীক্ষাটি আনলক করে দেয়। দীর্ঘক্ষণ আনলক না হলে অনুগ্রহ করে স্ক্রিনশটসহ আমাদের হোয়াটসঅ্যাপ বা ইমেইলে যোগাযোগ করুন।"
    },
    {
      q: "পরীক্ষার মাঝখানে ইন্টারনেট চলে গেলে কী হবে?",
      a: "আমাদের প্ল্যাটফর্মে পরীক্ষা দেওয়ার সময় ডাটা অটো-সেভ হতে থাকে। তবে দীর্ঘক্ষণ অফলাইনে থাকলে পরীক্ষা সাবমিট করা সম্ভব নাও হতে পারে। পুনরায় লোড দিয়ে পরীক্ষা দেওয়ার পরামর্শ দেওয়া হচ্ছে।"
    },
    {
      q: "মেধা তালিকা (Leaderboard) কীভাবে তৈরি হয়?",
      a: "পরীক্ষার্থীদের প্রাপ্ত নম্বর এবং পরীক্ষা সম্পন্ন করতে নেওয়া সময়ের ওপর ভিত্তি করে লাইভ মেধা তালিকা তৈরি হয়। একই নম্বর পেলে যিনি কম সময় নিয়েছেন তিনি তালিকায় এগিয়ে থাকবেন।"
    },
    {
      q: "আমি কীভাবে ইমেইল বা পাসওয়ার্ড পরিবর্তন করতে পারি?",
      a: "লগইন করা অবস্থায় প্রোফাইল আইকনে ক্লিক করে আপনি আপনার তথ্য দেখতে পারেন। যেকোনো বিশেষ পরিবর্তনের জন্য এডমিনের সাথে যোগাযোগ করুন।"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8 max-w-4xl mx-auto pb-12"
    >
      {/* Header section */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h2 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight flex items-center gap-2.5">
          <HelpCircle className="w-7 h-7 text-rose-550" />
          <span>হেল্পলাইন ও নির্দেশিকা (Helpline & FAQ)</span>
        </h2>
        <p className="text-xs text-slate-450 dark:text-slate-400 mt-1.5 leading-relaxed">
          এক্সাম নেস্ট প্ল্যাটফর্ম ব্যবহারের নিয়মাবলী, সাধারণ প্রশ্নোত্তর এবং যেকোনো প্রয়োজনে সরাসরি আমাদের Facebook Group অথবা Page-এ যোগাযোগ করুন।
        </p>
      </div>

      {/* Grid of contact cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* WhatsApp Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-start gap-4 shadow-xs"
        >
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-450 shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">হোয়াটসঅ্যাপ সাপোর্ট</h3>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">+8801788381680</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-normal">যেকোনো পেমেন্ট সংক্রান্ত জটিলতা বা একাউন্ট সংক্রান্ত সহায়তার জন্য চ্যাট করুন।</p>
            <a 
              href="https://wa.me/8801788381680" 
              target="_blank" 
              rel="noreferrer"
              onClick={() => trackEvent("helpline_whatsapp_click")}
              className="inline-flex items-center gap-1 text-[13px] font-black text-emerald-600 dark:text-emerald-400 hover:underline pt-1.5 cursor-pointer"
            >
              <span>সরাসরি চ্যাট করুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        {/* Email Support Card */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl flex items-start gap-4 shadow-xs"
        >
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-450 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ইমেইল সাপোর্ট</h3>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">support.examnest@gmail.com</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-normal">যেকোনো ব্যবসায়িক যোগাযোগ, পরামর্শ অথবা সুনির্দিষ্ট অভিযোগ ইমেইল করুন।</p>
            <a 
              href="mailto:support.examnest@gmail.com"
              onClick={() => trackEvent("helpline_email_click")}
              className="inline-flex items-center gap-1 text-[13px] font-black text-blue-600 dark:text-blue-400 hover:underline pt-1.5 cursor-pointer"
            >
              <span>ইমেইল পাঠান</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* General Instructions Accordion-style layout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-450">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">পরীক্ষা দেওয়ার নির্দেশিকা</h3>
            <p className="text-[13px] text-slate-400 mt-0.5">সহজ ও নিখুঁতভাবে অনলাইন পরীক্ষায় অংশগ্রহণের নিয়মাবলী</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 pt-1">
          {bcsGuides.map((guide, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="shrink-0">{guide.icon}</div>
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-250">{guide.title}</h4>
              </div>
              <p className="text-[13px] text-slate-550 dark:text-slate-400 leading-relaxed pl-7">
                {guide.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150/70 dark:border-slate-800/80 p-5 rounded-2xl space-y-2"
            >
              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-start gap-1.5 leading-snug">
                <span className="font-mono text-[12px] bg-indigo-100/60 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md font-extrabold text-indigo-700 dark:text-indigo-400 shrink-0">প্রশ্ন {idx + 1}</span>
                <span>{faq.q}</span>
              </h4>
              <p className="text-[13px] text-slate-600 dark:text-slate-350 leading-relaxed pl-13">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Notice Card */}
      <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-150 dark:border-amber-900/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-400">সতর্কবার্তা ও গোপনীয়তা</h4>
          <p className="text-[13px] text-amber-700/90 dark:text-amber-400/80 leading-relaxed">
            কোনো বিকাশ/রকেট/নগদ লেনদেনের ক্ষেত্রে কেবল আমাদের অফিসিয়াল নাম্বারগুলো ব্যবহার করুন। এক্সাম নেস্ট এডমিন কখনো আপনার ব্যক্তিগত ওটিপি (OTP) বা পাসওয়ার্ড জানতে চাইবে না। নিজের অ্যাকাউন্ট সুরক্ষিত রাখুন।
          </p>
        </div>
      </div>
    </motion.div>
  );
}
