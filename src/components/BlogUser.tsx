import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, doc, updateDoc, getDocs, query, where, orderBy, increment } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Calendar, Eye, Search, ArrowLeft, Loader2, Tag, ChevronRight, Clock, Award
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "../lib/analytics";

interface Blog {
  id: string;
  blogTitle: string;
  blogSlug: string;
  blogSummary: string;
  blogText: string;
  blogImageUrl?: string;
  blogViewCount: number;
  isBlogVisible: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
}

export default function BlogUser() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);

  // Fetch only visible blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const blogsRef = collection(db, "blogs");
        const q = query(
          blogsRef, 
          where("isBlogVisible", "==", true),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list: Blog[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Blog);
        });
        setBlogs(list);
        trackEvent("blog_feed_load", { count: list.length });
      } catch (err) {
        console.error("Error fetching user blogs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Handle Blog view detail + Increment count
  const handleBlogClick = async (blog: Blog) => {
    setSelectedBlog(blog);
    trackEvent("blog_view", { blogId: blog.id, title: blog.blogTitle, slug: blog.blogSlug });
    
    // Increment view count in Firestore safely (diff rule allows updating blogViewCount by +1)
    try {
      const blogDocRef = doc(db, "blogs", blog.id);
      await updateDoc(blogDocRef, {
        blogViewCount: increment(1)
      });
      // Locally increment so it updates in UI instantly
      setBlogs(prev => prev.map(b => b.id === blog.id ? { ...b, blogViewCount: (b.blogViewCount || 0) + 1 } : b));
    } catch (err) {
      console.warn("Could not increment view count:", err);
    }
  };

  const filteredBlogs = blogs.filter(b => 
    b.blogTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.blogSummary && b.blogSummary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">
      <AnimatePresence mode="wait">
        {selectedBlog ? (
          // Full Blog Detail View
          <motion.div
            key="blog-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Back Button and Metadata */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedBlog(null);
                  trackEvent("blog_back_to_list");
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-850 transition-all flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>তালিকায় ফিরুন (Back)</span>
              </button>
              
              <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-xs font-mono">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedBlog.createdAt).toLocaleDateString("bn-BD")}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold">
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  {selectedBlog.blogViewCount + 1} ভিউজ
                </span>
              </div>
            </div>

            {/* Main Article Container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
              {/* Featured Image */}
              {selectedBlog.blogImageUrl && (
                <div className="w-full max-h-[380px] overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                  <img
                    src={selectedBlog.blogImageUrl}
                    alt={selectedBlog.blogTitle}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Title and Tags */}
              <div className="space-y-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                  {selectedBlog.blogTitle}
                </h1>
                
                {selectedBlog.tags && selectedBlog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedBlog.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750 text-slate-500 dark:text-slate-400 font-extrabold px-2.5 py-1 rounded-lg font-mono uppercase tracking-wide"
                      >
                        <Tag className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Short summary block if exists */}
              {selectedBlog.blogSummary && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/25 border-l-4 border-indigo-500 rounded-r-2xl text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic font-medium leading-relaxed">
                  {selectedBlog.blogSummary}
                </div>
              )}

              {/* Article Content Render */}
              <div className="prose prose-slate max-w-none text-slate-800 dark:text-slate-100 text-sm leading-relaxed dark:prose-invert">
                <ReactMarkdown>{selectedBlog.blogText}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ) : (
          // Blog Feed List View
          <motion.div
            key="blog-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/5 rounded-full blur-xl" />
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">শিক্ষামূলক ব্লগ ও গাইডলাইন (Exam Portal Blog)</h2>
                  <p className="text-xs text-emerald-100 mt-1">ক্যারিয়ার পরামর্শ, বিসিএস ও কুইজ প্রস্তুতির সর্বশেষ দিকনির্দেশনা ও গুরুত্বপূর্ণ তথ্য সংগ্রহশালা।</p>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-3.5 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="relative w-full max-w-sm">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ব্লগ বা গাইডলাইন অনুসন্ধান করুন..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    trackEvent("blog_search", { query: val });
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
                />
              </div>
            </div>

            {/* Article Grid List */}
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">নতুন ব্লগ ও কন্টেন্ট লোড করা হচ্ছে...</p>
              </div>
            ) : filteredBlogs.length > 0 ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                {filteredBlogs.map((blog, idx) => (
                  <motion.article
                    key={blog.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleBlogClick(blog)}
                    className="group bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:shadow-xs hover:shadow-emerald-500/5 transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center cursor-pointer"
                  >
                    {/* Cover thumbnail */}
                    {blog.blogImageUrl ? (
                      <div className="w-full sm:w-32 h-36 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <img
                          src={blog.blogImageUrl}
                          alt={blog.blogTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-full sm:w-32 h-36 sm:h-24 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-slate-800 space-y-1">
                        <BookOpen className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                        <span className="text-[8px] font-bold tracking-wider uppercase font-mono text-slate-400 dark:text-slate-500">ARTICLE</span>
                      </div>
                    )}

                    {/* Blog text details block */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Tags */}
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {blog.tags.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-[9px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-extrabold uppercase">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                        {blog.blogTitle}
                      </h3>

                      {blog.blogSummary ? (
                        <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {blog.blogSummary}
                        </p>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500 text-xs italic line-clamp-2 leading-relaxed">
                          কন্টেন্ট সম্পর্কে জানতে এই পোস্টে ক্লিক করুন...
                        </p>
                      )}

                      {/* Footer stats row */}
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 pt-1.5 font-medium">
                        <div className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(blog.createdAt).toLocaleDateString("bn-BD")}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{blog.blogViewCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Chevron trigger icon */}
                    <div className="hidden sm:block shrink-0 pl-2">
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-16 text-center max-w-md mx-auto space-y-4">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">কোনো ব্লগ পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    এই মুহূর্তে পোর্টালটিতে কোনো শিক্ষামূলক কন্টেন্ট বা গাইডলাইন আর্টিকেল পাবলিশ করা নেই। দয়া করে পরবর্তীতে পুনরায় চেষ্টা করুন।
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
