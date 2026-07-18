import React, { useState, useEffect, useRef } from "react";
import { Exam, Question, Attempt } from "../types";
import { DEFAULT_QUESTIONS } from "../data";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  Send, 
  Timer, 
  ChevronRight, 
  Home, 
  BookOpen,
  Share2,
  Twitter,
  Facebook,
  Mail,
  ListOrdered,
  HelpCircle,
  Copy,
  Info,
  Printer,
  RefreshCw
} from "lucide-react";

interface ActiveExamProps {
  exam: Exam;
  username: string;
  currentUser: any;
  googleAppsScriptUrl: string;
  onExit: () => void;
  onViewLeaderboard: () => void;
  mode?: "take" | "retake" | "view_questions" | "view_result";
  userPremiumUntil?: string | null;
}

export default function ActiveExam({ 
  exam, 
  username, 
  currentUser, 
  googleAppsScriptUrl, 
  onExit,
  onViewLeaderboard,
  mode = "take",
  userPremiumUntil = null
}: ActiveExamProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");

  // Exam taking state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(exam.timeLimit * 60); // in seconds
  const [isSubmitted, setIsSubmitted] = useState(mode === "view_result" || mode === "view_questions");
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);

  // Email validation step (before showing results)
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [emailInput, setEmailInput] = useState(currentUser?.email || "");
  const [emailError, setEmailError] = useState("");
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  // Final results state
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [attemptId, setAttemptId] = useState("");
  const [copied, setCopied] = useState(false);

  // Negative marking score breakdowns
  const [totalObtainedMark, setTotalObtainedMark] = useState(0);
  const [examTotalMark, setExamTotalMark] = useState(0);
  const [markPerQuestion, setMarkPerQuestion] = useState(1);
  const [penaltyMark, setPenaltyMark] = useState(0.25);
  const [correctCountState, setCorrectCountState] = useState(0);
  const [wrongCountState, setWrongCountState] = useState(0);
  const [skippedCountState, setSkippedCountState] = useState(0);

  const [isPrintFree, setIsPrintFree] = useState<boolean>(true);
  const [showPremiumPrintModal, setShowPremiumPrintModal] = useState<boolean>(false);

  // Fetch print permission settings from Firestore
  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docSnap = await getDoc(doc(db, "settings", "printSettings"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isPrintFree !== undefined) {
            setIsPrintFree(Boolean(data.isPrintFree));
          }
        }
      } catch (e) {
        console.error("Error loading print settings:", e);
      }
    };
    fetchPrintSettings();
  }, []);

  // Trackers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // 1. Fetch questions on load
  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true);
      setError("");
      setIsUsingFallback(false);

      if (googleAppsScriptUrl) {
        try {
          const url = `${googleAppsScriptUrl}?tab=${exam.tabName}&action=getQuestions&tabName=${exam.tabName}`;
          const res = await fetch(url);
          const data = await res.json();
          
          let questionsList: any[] = [];
          if (Array.isArray(data)) {
            questionsList = data;
          } else if (data && Array.isArray(data.questions)) {
            questionsList = data.questions;
          } else if (data && data.error) {
            console.warn("Apps Script returned error:", data.error);
          }

          if (questionsList.length > 0) {
            // Normalize questions structure
            const normalized = questionsList.map((q: any, idx: number) => ({
              questionNo: Number(q.questionNo || q.question_no || q.slNo || q.no) || (idx + 1),
              question: String(q.question || q.text || q.questionText || ""),
              optionA: String(q.optionA || q.option_a || q.a || q.A || ""),
              optionB: String(q.optionB || q.option_b || q.b || q.B || ""),
              optionC: String(q.optionC || q.option_c || q.c || q.C || ""),
              optionD: String(q.optionD || q.option_d || q.d || q.D || ""),
              correctAnswer: String(q.correctAnswer || q.correct_answer || q.answer || q.correct || "a").trim().toLowerCase(),
              explanation: String(q.explanation || q.exp || ""),
              topic: q.topic ? String(q.topic).trim() : undefined
            }));

            const valid = normalized.filter(q => q.question);
            if (valid.length > 0) {
              setQuestions(valid);
              setTotalQuestions(valid.length);
              setLoading(false);
              startTimeRef.current = Date.now();
              return;
            }
          }
        } catch (err: any) {
          console.warn("Apps Script fetch failed, using fallback database:", err.message);
        }
      }

      // Fallback
      const fallbackQs = DEFAULT_QUESTIONS[exam.tabName];
      if (fallbackQs && fallbackQs.length > 0) {
        setQuestions(fallbackQs);
        setTotalQuestions(fallbackQs.length);
        setIsUsingFallback(true);
      } else {
        setError("No questions found for this exam tab. Please configure standard questions or connect Google Sheets.");
      }
      setLoading(false);
      startTimeRef.current = Date.now();
    }

    fetchQuestions();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam, googleAppsScriptUrl]);

  // 2. Timer Countdown Logic
  useEffect(() => {
    if (loading || error || isSubmitted || showEmailGate || mode === "view_questions") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, error, isSubmitted, showEmailGate, mode]);

  const gradeExamDirectly = () => {
    // Calculate score
    let correctCount = 0;
    let skippedCount = 0;
    let wrongCount = 0;
    questions.forEach((q, idx) => {
      const qKey = (q.questionNo !== undefined && q.questionNo !== "") ? Number(q.questionNo) : (idx + 1);
      const userAnswer = (selectedAnswers[qKey] || "").toLowerCase().trim();
      const correctAnswer = (q.correctAnswer || "").toLowerCase().trim();
      
      if (userAnswer === "") {
        skippedCount++;
      } else if (userAnswer === correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    // Retrieved config marks
    const markPerQ = exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1;
    const penaltyM = exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25;
    const calcObtained = correctCount * markPerQ - wrongCount * penaltyM;
    const calcTotal = questions.length * markPerQ;

    setScore(correctCount);
    setCorrectCountState(correctCount);
    setWrongCountState(wrongCount);
    setSkippedCountState(skippedCount);
    setMarkPerQuestion(markPerQ);
    setPenaltyMark(penaltyM);
    setTotalObtainedMark(calcObtained);
    setExamTotalMark(calcTotal);

    setAttemptId("retake-practice-" + Math.random().toString(36).substring(2, 8));
    setIsSubmitted(true);
  };

  const handleTimeUp = () => {
    setIsTimeUp(true);
    // Freeze answers, freeze timeTaken
    const finalTimeTaken = exam.timeLimit * 60;
    setTimeTaken(finalTimeTaken);
    
    if (mode === "retake") {
      gradeExamDirectly();
    } else {
      // Automatically trigger the email gate for submission!
      setShowEmailGate(true);
    }
  };

  const handleOptionSelect = (qNo: number, option: string) => {
    if (isSubmitted || showEmailGate || mode === "view_questions") return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qNo]: option
    }));
  };

  // Submit trigger - opens email gate
  const handleTriggerSubmit = () => {
    const finalTimeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setTimeTaken(Math.min(finalTimeTaken, exam.timeLimit * 60));
    if (mode === "retake") {
      gradeExamDirectly();
    } else {
      setShowEmailGate(true);
    }
  };

  // 3. Final submission with valid email
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!emailInput.trim()) {
      setEmailError("A valid email address is required to register your score.");
      return;
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsSubmittingResult(true);

    try {
      // Calculate score
      let correctCount = 0;
      let skippedCount = 0;
      let wrongCount = 0;
      questions.forEach((q, idx) => {
        const qKey = (q.questionNo !== undefined && q.questionNo !== "") ? Number(q.questionNo) : (idx + 1);
        const userAnswer = (selectedAnswers[qKey] || "").toLowerCase().trim();
        const correctAnswer = (q.correctAnswer || "").toLowerCase().trim();
        
        if (userAnswer === "") {
          skippedCount++;
        } else if (userAnswer === correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
        }
      });

      // Retrieved config marks
      const markPerQ = exam.markPerQuestion !== undefined ? exam.markPerQuestion : 1;
      const penaltyM = exam.penaltyMark !== undefined ? exam.penaltyMark : 0.25;
      const calcObtained = correctCount * markPerQ - wrongCount * penaltyM;
      const calcTotal = questions.length * markPerQ;

      setScore(correctCount);
      setCorrectCountState(correctCount);
      setWrongCountState(wrongCount);
      setSkippedCountState(skippedCount);
      setMarkPerQuestion(markPerQ);
      setPenaltyMark(penaltyM);
      setTotalObtainedMark(calcObtained);
      setExamTotalMark(calcTotal);

      const generatedId = "attempt-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString().slice(-4);
      setAttemptId(generatedId);

      const pct = Math.round((correctCount / questions.length) * 100) || 0;

      const attemptData: Attempt = {
        id: generatedId,
        examId: exam.id,
        examName: exam.name,
        username: username,
        email: emailInput.trim(),
        score: correctCount,
        totalQuestions: questions.length,
        timeTaken: timeTaken || 1, // at least 1 second
        completedAt: new Date().toISOString(),
        correctCount: correctCount,
        wrongCount: wrongCount,
        skippedCount: skippedCount,
        percentage: pct,
        totalObtainedMark: calcObtained,
        examTotalMark: calcTotal,
        markPerQuestion: markPerQ,
        penaltyMark: penaltyM
      };

      if (currentUser?.uid) {
        attemptData.userId = currentUser.uid;
      }

      // Store in Firestore "attempts" collection for leaderboard
      try {
        await setDoc(doc(db, "attempts", generatedId), attemptData);
      } catch (writeErr) {
        handleFirestoreError(writeErr, OperationType.CREATE, `attempts/${generatedId}`);
      }

      // Record in localAttemptedExams to prevent repeat attempts
      try {
        const localAttemptsStr = localStorage.getItem("localAttemptedExams") || "[]";
        let parsed = JSON.parse(localAttemptsStr);
        if (!Array.isArray(parsed)) {
          parsed = [];
        }
        if (!parsed.includes(exam.id)) {
          parsed.push(exam.id);
          localStorage.setItem("localAttemptedExams", JSON.stringify(parsed));
        }
      } catch (e) {
        console.error("Error saving localAttemptedExams to localStorage:", e);
      }

      // Trigger Google Analytics Event
      try {
        const { trackEvent } = await import("../lib/analytics");
        trackEvent("submit_exam", {
          examId: exam.id,
          examName: exam.name,
          username: username,
          score: correctCount,
          totalQuestions: questions.length,
          percentage: pct,
          totalObtainedMark: calcObtained,
          examTotalMark: calcTotal
        });
      } catch (e) {
        console.warn("GA submit_exam trigger failed:", e);
      }

      // Successfully saved!
      setIsSubmitted(true);
      setShowEmailGate(false);
    } catch (err: any) {
      console.error("Submission failed details:", err);
      setEmailError("দুঃখিত, উত্তরপত্র জমা দেওয়া সম্ভব হয়নি। দয়া করে ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন। (Failed to submit response)");
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const shareResultTwitter = () => {
    const scorePct = Math.round((score / totalQuestions) * 100);
    const timeStr = formatTime(timeTaken);
    const text = `🏆 I scored ${score}/${totalQuestions} (${scorePct}%) in the "${exam.name}" exam in ${timeStr}! Can you beat my score? #LeaderboardChallenge`;
    const shareUrl = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  const shareResultFacebook = () => {
    const scorePct = Math.round((score / totalQuestions) * 100);
    const timeStr = formatTime(timeTaken);
    const text = `🏆 I scored ${score}/${totalQuestions} (${scorePct}%) in the "${exam.name}" exam in ${timeStr}! Can you beat my score? #LeaderboardChallenge`;
    const shareUrl = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookUrl, "_blank");
  };

  const copyResultSummary = () => {
    const scorePct = Math.round((score / totalQuestions) * 100);
    const timeStr = formatTime(timeTaken);
    const text = `🏆 Exam Result Summary:
Exam: ${exam.name}
Candidate: ${username}
Score: ${score}/${totalQuestions} (${scorePct}%)
Time Taken: ${timeStr}
Well done! Join the challenge here: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintOrDownload = async () => {
    // 1. Check permissions
    const isPremium = userPremiumUntil ? new Date(userPremiumUntil).getTime() > Date.now() : false;
    const isAdmin = currentUser?.email === "admin@examportal.com" || currentUser?.email === "club.gobindapur@gmail.com";
    const canPrint = isPrintFree || isPremium || isAdmin;

    if (!canPrint) {
      setShowPremiumPrintModal(true);
      return;
    }

    try {
      try {
        const { trackEvent } = await import("../lib/analytics");
        trackEvent("print_exam_result", {
          examId: exam.id,
          examName: exam.name,
          username: username
        });
      } catch (e) {
        console.warn("GA print_exam_result trigger failed:", e);
      }
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      alert("দুঃখিত, প্রিন্ট বা পিডিএফ ডাউনলোড করার সময় একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }
  };

  // Derived states
  const uniqueTopics = Array.from(new Set(questions.map(q => q.topic).filter(Boolean))) as string[];
  const filteredQuestions = selectedTopic
    ? questions.filter(q => q.topic === selectedTopic)
    : questions;

  // Render Loader
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div>
          <p className="text-gray-900 font-bold text-lg">পরীক্ষা লোড হচ্ছে...</p>
          <p className="text-gray-500 text-xs mt-1 font-mono">অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।</p>
        </div>
      </div>
    );
  }

  // Render Error
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-100 p-12 text-center space-y-4 font-sans">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-full inline-block mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <p className="text-gray-900 font-bold text-lg">পরীক্ষা লোড করতে সমস্যা হয়েছে</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
        <button
          onClick={onExit}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm cursor-pointer"
        >
          পরীক্ষার তালিকায় ফিরে যান
        </button>
      </div>
    );
  }

  // Render Result Screen
  if (isSubmitted) {
    const scorePct = Math.round((score / totalQuestions) * 100);
    const isViewResultOnly = mode === "view_result" || mode === "view_questions";
    const isRetakeOnly = mode === "retake";

    return (
      <div className="space-y-8 font-sans">
        {/* Hero banner */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 print-hidden" />
          
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100 print-hidden">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest font-black text-emerald-600 font-mono block">
              {mode === "view_questions"
                ? "অফিশিয়াল প্রশ্নপত্র পর্যালোচনা (Question Paper Review)"
                : isViewResultOnly 
                  ? "অফিশিয়াল সমাধানপত্র পর্যালোচনা (Answer Key Review)" 
                  : isRetakeOnly 
                    ? "পুনরায় পরীক্ষা সম্পন্ন হয়েছে (Practice Attempt Completed)" 
                    : "পরীক্ষা সফলভাবে জমা দেওয়া হয়েছে (Submitted)"}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">{exam.name} {mode === "view_questions" ? "- প্রশ্ন ও সমাধান" : isViewResultOnly ? "- সঠিক সমাধান" : "- ফলাফল ও সমাধান"}</h2>
            {!isViewResultOnly && !isRetakeOnly && (
              <p className="text-sm text-gray-400 font-mono">অংশগ্রহণ আইডি (Attempt ID): {attemptId}</p>
            )}
            {isRetakeOnly && (
              <p className="text-sm text-indigo-500 font-bold font-mono">অনুশীলন মোড (Practice Mode - Result Not Saved)</p>
            )}
          </div>

          {/* Score Stats Cards - Only visible if taking/retaking, or if not view_result mode */}
          {!isViewResultOnly && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">মোট প্রাপ্ত নম্বর (Net Obtained)</span>
                <span className="text-2xl font-black text-indigo-600 mt-1 block">
                  {totalObtainedMark.toFixed(2)} / {examTotalMark}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">সঠিক: {correctCountState}, ভুল: {wrongCountState}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">সঠিক উত্তর সংখ্যা</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {correctCountState} / {totalQuestions}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">প্রতিটি প্রশ্ন: {markPerQuestion} নম্বর</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">ভুল ও পেনাল্টি মার্কস</span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">
                  -{(wrongCountState * penaltyMark).toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">কাটা গেছে: {penaltyMark} প্রতি ভুল</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">ব্যয়িত সময়</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block flex items-center justify-center gap-1">
                  <Timer className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>{formatTime(timeTaken)}</span>
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">সময় সীমা: {exam.timeLimit} মিনিট</span>
              </div>
            </div>
          )}

          {isViewResultOnly && (
            <div className="max-w-2xl mx-auto p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-slate-700 text-xs sm:text-sm leading-relaxed">
              নিচের প্রশ্নাবলী ও তাদের সঠিক সমাধানসমূহ পর্যালোচনা করুন। প্রতিটি প্রশ্নের জন্য অফিশিয়াল ব্যাখ্যা ও সঠিক উত্তর হাইলাইট করে দেওয়া হয়েছে।
            </div>
          )}

          {!isViewResultOnly && (
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              {isRetakeOnly 
                ? `অনুশীলন পরীক্ষা সম্পন্ন হয়েছে! অভিনন্দন, ${username}! আপনার অর্জিত স্কোর ও ফলাফল নিচে প্রদর্শন করা হলো।`
                : `অভিনন্দন, ${username}! আপনার ফলাফল সফলভাবে সংরক্ষণ করা হয়েছে। আপনার ইমেইল ${emailInput} ঠিকানায় বিস্তারিত রিপোর্ট পাঠানো হয়েছে।`
              }
            </p>
          )}

          {/* Social sharing and Navigation buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2 print-hidden">
            {!isViewResultOnly && (
              <>
                <button
                  onClick={shareResultTwitter}
                  className="px-5 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-medium rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Twitter className="w-4 h-4" />
                  <span>টুইটার(x)</span>
                </button>
                <button
                  onClick={shareResultFacebook}
                  className="px-5 py-3 bg-sky-50 text-blue-700 hover:bg-sky-100 hover:text-blue-800 font-medium rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Facebook className="w-4 h-4 text-blue-600" />
                  <span>ফেসবুক</span>
                </button>
                <button
                  onClick={copyResultSummary}
                  className="px-5 py-3 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-800 font-medium rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "কপি হয়েছে!" : "সারসংক্ষেপ কপি"}</span>
                </button>
              </>
            )}
            
            {/* Print Result / Download PDF Button */}
            <button
              onClick={handlePrintOrDownload}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>প্রিন্ট করুন / PDF ডাউনলোড</span>
            </button>

            {!isViewResultOnly && !isRetakeOnly && (
              <button
                onClick={onViewLeaderboard}
                className="px-5 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-medium rounded-xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>লাইভ মেধা তালিকা</span>
              </button>
            )}
            <button
              onClick={onExit}
              className="px-5 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>মূল ড্যাশবোর্ড</span>
            </button>
          </div>
        </div>

        {/* Detailed Review Section with Explanations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span>বিস্তারিত প্রশ্ন পর্যালোচনা (Review)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                আপনার উত্তরসমূহ যাচাই করুন এবং সঠিক ব্যাখ্যামূলক সমাধানটি পড়ে নিন।
              </p>
            </div>
            
            {uniqueTopics.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400 font-semibold">টপিক ফিল্টার:</span>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Topics</option>
                  {uniqueTopics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-6 divide-y divide-gray-100">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                এই টপিকে কোনো প্রশ্ন পর্যালোচনা করার জন্য পাওয়া যায়নি।
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const qNo = (q.questionNo !== undefined && q.questionNo !== "") ? Number(q.questionNo) : (questions.indexOf(q) + 1);
                const userAnswer = (selectedAnswers[qNo] || "").toLowerCase().trim();
                const correctAnswer = (q.correctAnswer || "").toLowerCase().trim();
                const isCorrect = userAnswer === correctAnswer;

                return (
                  <div key={idx} className={`pt-6 ${idx === 0 ? "pt-0" : ""} space-y-4`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isCorrect 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : userAnswer 
                          ? "bg-rose-50 text-rose-700 border border-rose-200" 
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {qNo}
                      </span>
                      <div>
                        {q.topic && (
                          <div className="mb-1">
                            <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {q.topic}
                            </span>
                          </div>
                        )}
                        <h4 className="text-sm font-semibold text-gray-900 leading-relaxed">{q.question}</h4>
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="grid sm:grid-cols-2 gap-3 pl-9">
                      {[
                        { key: "a", text: q.optionA },
                        { key: "b", text: q.optionB },
                        { key: "c", text: q.optionC },
                        { key: "d", text: q.optionD }
                      ].map((opt) => {
                        const isOptionSelected = userAnswer === opt.key;
                        const isOptionCorrect = correctAnswer === opt.key;
                        
                        let optStyle = "bg-gray-50/50 border-gray-100 text-gray-700";
                        if (isOptionCorrect) {
                          optStyle = "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium";
                        } else if (isOptionSelected && !isCorrect) {
                          optStyle = "bg-rose-50 border-rose-200 text-rose-800 font-medium";
                        }

                        return (
                          <div key={opt.key} className={`p-3 rounded-xl border text-xs flex gap-2 items-center ${optStyle}`}>
                            <span className="uppercase font-bold shrink-0">{opt.key}.</span>
                            <span className="break-words">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Block (Invisible before submit, beautifully displayed here!) */}
                    {q.explanation && (
                      <div className="ml-9 p-4 bg-indigo-50/30 rounded-xl border border-indigo-50/60 text-xs text-indigo-950/80 leading-relaxed space-y-1">
                        <span className="font-extrabold text-[10px] text-indigo-700 uppercase tracking-widest block font-sans">ব্যাখ্যা (Explanation):</span>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Exam Taking Screen
  return (
    <div className="space-y-6 font-sans">
      {/* Header with Dynamic Title, Timer, and Progress */}
      <div className="sticky top-0 z-40 bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            লাইভ পরীক্ষা কক্ষ (Live Portal)
          </span>
          <h2 className="text-xl font-extrabold text-gray-900">{exam.name}</h2>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="text-xs text-gray-400">পরীক্ষার্থী: <span className="font-bold text-gray-600">{username}</span></span>
            {isUsingFallback && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded" title="Using built-in question cache">
                <Info className="w-3 h-3" />
                <span>Sandbox DB</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="hidden sm:block text-right">
            <span className="text-xs text-gray-400 block font-medium">উত্তর দেওয়া প্রশ্নসমূহ</span>
            <span className="text-sm font-bold text-gray-700">
              {Object.keys(selectedAnswers).length} / {questions.length}
            </span>
          </div>

          {/* Countdown timer */}
          <div className={`py-2 px-4 rounded-xl flex items-center gap-2 border font-mono font-bold ${
            timeLeft <= 30 
              ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" 
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <Clock className={`w-4 h-4 ${timeLeft <= 30 ? "text-rose-500" : "text-gray-500"}`} />
            <span className="text-lg">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={handleTriggerSubmit}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>পরীক্ষা শেষ করুন</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Topic Filter Section */}
      {uniqueTopics.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-3 print-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                টপিক অনুযায়ী প্রশ্ন ফিল্টার করুন (Filter Questions by Topic)
              </span>
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]"
            >
              <option value="">All Topics ({questions.length})</option>
              {uniqueTopics.map((topic) => {
                const count = questions.filter(q => q.topic === topic).length;
                return (
                  <option key={topic} value={topic}>
                    {topic} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* ALL Questions in one single page */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            এই টপিকে কোনো প্রশ্ন পাওয়া যায়নি।
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-gray-100">
            {filteredQuestions.map((q, idx) => {
              const qNo = (q.questionNo !== undefined && q.questionNo !== "") ? Number(q.questionNo) : (questions.indexOf(q) + 1);
              const isAnswered = selectedAnswers[qNo] !== undefined;

              return (
                <div key={idx} className={`pt-6 ${idx === 0 ? "pt-0" : ""} space-y-4`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isAnswered 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {qNo}
                    </span>
                    <div>
                      {q.topic && (
                        <div className="mb-1 flex">
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {q.topic}
                          </span>
                        </div>
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 leading-relaxed">{q.question}</h3>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid sm:grid-cols-2 gap-3 pl-9">
                    {[
                      { key: "a", text: q.optionA },
                      { key: "b", text: q.optionB },
                      { key: "c", text: q.optionC },
                      { key: "d", text: q.optionD }
                    ].map((opt) => {
                      const isSelected = selectedAnswers[qNo] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleOptionSelect(qNo, opt.key)}
                          className={`p-3.5 rounded-xl border text-xs text-left flex gap-3 items-center transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-indigo-50/70 border-indigo-400 text-indigo-900 shadow-sm font-semibold" 
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50/50 hover:border-gray-300"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md border text-[10px] font-bold uppercase flex items-center justify-center shrink-0 transition-colors ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-gray-50 border-gray-300 text-gray-500"
                          }`}>
                            {opt.key}
                          </span>
                          <span className="break-words leading-relaxed">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit footer button */}
      <div className="flex justify-end p-2">
        <button
          onClick={handleTriggerSubmit}
          className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm cursor-pointer"
        >
          <span>পরীক্ষা শেষ ও জমা দিন (Finish)</span>
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Email Submission Gate Dialog (Triggers on Timer Up OR Click Submit) */}
      <AnimatePresence>
        {showEmailGate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 font-sans"
            >
              <div className="h-1.5 bg-indigo-600" />
              
              <div className="p-8 space-y-6 font-sans">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {isTimeUp ? "⏰ সময় শেষ হয়েছে!" : "আপনার ইমেইল আইডি দিন"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isTimeUp 
                      ? "পরীক্ষার সময় শেষ হয়েছে। উত্তরপত্র জমা দিতে এবং স্কোর লক করতে অনুগ্রহ করে ইমেইল আইডি প্রদান করুন।" 
                      : "আপনার উত্তরপত্র সফলভাবে যাচাই করার জন্য ইমেইল আইডি দিন যেখানে কুইজের পূর্ণাঙ্গ রিপোর্ট কার্ড পাঠিয়ে দেওয়া হবে।"
                    }
                  </p>
                </div>

                {emailError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                <form onSubmit={handleFinalSubmit} className="space-y-4 font-sans">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                      পরীক্ষার্থীর ইমেইল (Email)
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="যেমন: you@example.com"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    {!isTimeUp && (
                      <button
                        type="button"
                        onClick={() => setShowEmailGate(false)}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        ফিরে যান
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingResult}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      {isSubmittingResult ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>জমা দিন (Submit)</span>
                          <CheckCircle className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showPremiumPrintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-2xl p-6 max-w-sm w-full text-center space-y-4 animate-scale-up"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">প্রিমিয়াম মেম্বারশিপ প্রয়োজন</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                দুঃখিত, এই পিডিএফ ডাউনলোড অপশনটি শুধুমাত্র প্রিমিয়াম মেম্বারদের জন্য সংরক্ষিত। দয়া করে আপনার মেম্বারশিপ প্রিমিয়ামে উন্নীত করুন।
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowPremiumPrintModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
