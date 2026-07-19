import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from "firebase/firestore";
import { 
  Plus, Trash2, Edit, Eye, EyeOff, Save, Loader2, Calendar, 
  Bold, Italic, Heading, Link, List, Image, FileText, X, Sparkles, Search
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

export default function AdminBlogManager() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlogId, setCurrentBlogId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [tagsInput, setTagsInput] = useState("");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");

  // Fetch blogs
  const fetchBlogs = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q).catch((getErr) => {
        handleFirestoreError(getErr, OperationType.LIST, "blogs");
        throw getErr;
      });
      const list: Blog[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Blog);
      });
      setBlogs(list);
      trackEvent("admin_blogs_load", { count: list.length });
    } catch (err: any) {
      console.error(err);
      setError("ব্লগ তালিকা লোড করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Slug generator (works nicely with Bengali & English)
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09ff]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post-" + Math.random().toString(36).substring(2, 6);
  };

  // Quick Format Injector for Markdown
  const injectMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("blog-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    const replacement = prefix + (selected || "text") + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    setContent(newContent);
    
    // Focus back & select
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length);
    }, 50);
  };

  // Save/Update Handler
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !content.trim()) {
      setError("শিরোনাম এবং কন্টেন্ট আবশ্যিক!");
      return;
    }

    setSaving(true);
    try {
      const blogId = currentBlogId || "blog-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString().slice(-4);
      trackEvent("admin_blog_save_start", { mode: currentBlogId ? "edit" : "create", title: title.trim(), id: blogId });
      const slug = generateSlug(title.trim());
      const tagsArray = tagsInput.split(",").map(t => t.trim()).filter(t => t.length > 0);

      const blogData: Partial<Blog> = {
        id: blogId,
        blogTitle: title.trim(),
        blogSlug: slug,
        blogSummary: summary.trim(),
        blogText: content,
        blogImageUrl: imageUrl.trim() || "",
        isBlogVisible: isVisible,
        updatedAt: new Date().toISOString(),
        tags: tagsArray,
      };

      if (!currentBlogId) {
        blogData.createdAt = new Date().toISOString();
        blogData.blogViewCount = 0;
        blogData.createdBy = "admin";
      }

      const docRef = doc(db, "blogs", blogId);
      await setDoc(docRef, blogData, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `blogs/${blogId}`);
        throw err;
      });

      trackEvent("admin_blog_save_success", { mode: currentBlogId ? "edit" : "create", id: blogId });
      setSuccess(currentBlogId ? "ব্লগটি সফলভাবে আপডেট করা হয়েছে!" : "নতুন ব্লগ সফলভাবে তৈরি করা হয়েছে!");
      resetForm();
      fetchBlogs();
    } catch (err: any) {
      console.error(err);
      trackEvent("admin_blog_save_failure", { mode: currentBlogId ? "edit" : "create", error: err.message });
      setError("ব্লগ সংরক্ষণ করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Visibility Status quickly
  const handleToggleVisibility = async (blog: Blog) => {
    try {
      trackEvent("admin_blog_toggle_visibility", { id: blog.id, title: blog.blogTitle, isVisible: !blog.isBlogVisible });
      const docRef = doc(db, "blogs", blog.id);
      await setDoc(docRef, { isBlogVisible: !blog.isBlogVisible, updatedAt: new Date().toISOString() }, { merge: true });
      // Update local state for fast UI refresh
      setBlogs(prev => prev.map(b => b.id === blog.id ? { ...b, isBlogVisible: !b.isBlogVisible } : b));
    } catch (err: any) {
      console.error(err);
      alert("ভিজিবিলিটি টগল ব্যর্থ হয়েছে: " + err.message);
    }
  };

  // Delete Blog with Confirm
  const handleDeleteBlog = async (blogId: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ব্লগটি ডিলিট করতে চান? এটি আর ফেরত আনা যাবে না।")) {
      return;
    }

    trackEvent("admin_blog_delete_start", { id: blogId });
    setError("");
    try {
      await deleteDoc(doc(db, "blogs", blogId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `blogs/${blogId}`);
        throw err;
      });
      trackEvent("admin_blog_delete_success", { id: blogId });
      setSuccess("ব্লগটি সফলভাবে ডিলিট করা হয়েছে!");
      fetchBlogs();
    } catch (err: any) {
      console.error(err);
      trackEvent("admin_blog_delete_failure", { id: blogId, error: err.message });
      setError("ব্লগ ডিলিট করতে ব্যর্থ হয়েছে: " + err.message);
    }
  };

  const handleEditClick = (blog: Blog) => {
    trackEvent("admin_blog_edit_click", { id: blog.id, title: blog.blogTitle });
    setCurrentBlogId(blog.id);
    setTitle(blog.blogTitle);
    setSummary(blog.blogSummary || "");
    setContent(blog.blogText);
    setImageUrl(blog.blogImageUrl || "");
    setIsVisible(blog.isBlogVisible);
    setTagsInput(blog.tags ? blog.tags.join(", ") : "");
    setIsEditing(true);
    setEditorTab("write");
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentBlogId(null);
    setTitle("");
    setSummary("");
    setContent("");
    setImageUrl("");
    setIsVisible(true);
    setTagsInput("");
  };

  const filteredBlogs = blogs.filter(b => 
    b.blogTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.blogSummary && b.blogSummary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100">
      {/* Header card */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/5 rounded-full blur-xl" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">ব্লগ ম্যানেজমেন্ট (Blog Panel)</h2>
            <p className="text-xs text-slate-400">পরীক্ষার্থীদের সহায়তায় শিক্ষামূলক কনটেন্ট, ক্যারিয়ার টিপস ও নিউজ আর্টিকেল প্রকাশ ও সংশোধন করুন।</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs border border-rose-100 dark:border-rose-900/30 font-bold flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs border border-emerald-100 dark:border-emerald-900/30 font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Editor Form Modal or Collapsible */}
      {isEditing ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-md font-bold text-slate-900 dark:text-white">
              {currentBlogId ? "📝 ব্লগ আর্টিকেল সংশোধন করুন (Edit Blog)" : "✨ নতুন ব্লগ আর্টিকেল লিখুন (Create Blog)"}
            </h3>
            <button 
              onClick={resetForm}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveBlog} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">ব্লগের শিরোনাম (Blog Title) *</label>
                <input
                  type="text"
                  placeholder="যেমন: বিসিএস প্রস্তুতিতে সাধারণ জ্ঞানের সহজ গাইডলাইন..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">ট্যাগসমূহ (Tags - কমা দিয়ে আলাদা করুন)</label>
                <input
                  type="text"
                  placeholder="যেমন: BCS, General Knowledge, Career Tips"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">ফিচারড ইমেজ লিংক (Featured Image URL) [ঐচ্ছিক]</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:border-indigo-500 outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">সংক্ষিপ্ত বিবরণ (Short Summary / Preview Description)</label>
                <input
                  type="text"
                  placeholder="ব্লগ লিফলেট হিসেবে ১-২ বাক্যের মূল আকর্ষণ..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-transparent text-sm focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Content Field with Tabs & Markdown Helper Bar */}
            <div className="space-y-2 border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex justify-between items-center px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 flex-wrap gap-2">
                {/* Tabs */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorTab("write")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      editorTab === "write" 
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    লিখুন (Editor)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      editorTab === "preview" 
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    লাইভ প্রিভিউ (Live Preview)
                  </button>
                </div>

                {/* Markdown Toolbar */}
                {editorTab === "write" && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Bold"
                      onClick={() => injectMarkdown("**", "**")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      onClick={() => injectMarkdown("*", "*")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Heading"
                      onClick={() => injectMarkdown("### ")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
                    >
                      <Heading className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Link"
                      onClick={() => injectMarkdown("[", "](url)")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
                    >
                      <Link className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="List"
                      onClick={() => injectMarkdown("- ")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Image Markdown"
                      onClick={() => injectMarkdown("![alt](", ")")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
                    >
                      <Image className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Blockquote"
                      onClick={() => injectMarkdown("> ")}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold"
                    >
                      &ldquo;
                    </button>
                  </div>
                )}
              </div>

              {editorTab === "write" ? (
                <textarea
                  id="blog-textarea"
                  placeholder="ব্লগ কনটেন্ট লিখুন (এখানে পূর্ণাঙ্গ আর্টিকেল লিখুন, সাধারণ টেক্সট অথবা মারকডাউন ফরম্যাটে লিখতে পারেন)..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 bg-transparent text-sm font-sans outline-none resize-y min-h-[250px] border-none"
                  required
                />
              ) : (
                <div className="p-5 overflow-y-auto max-h-[400px] min-h-[250px] bg-white dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 prose prose-slate max-w-none text-sm dark:prose-invert">
                  {content ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-400 italic">প্রিভিউ করার মতো কোনো কন্টেন্ট নেই।</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center pt-2 gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span>পাবলিকভাবে দৃশ্যমান করুন (Visible to Everyone)</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-all"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>আর্টিকেল প্রকাশ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="ব্লগ সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  trackEvent("admin_blog_search", { query: val });
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold"
              />
            </div>

            <button
              onClick={() => {
                setIsEditing(true);
                trackEvent("admin_blog_click_new");
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ব্লগ পোস্ট করুন</span>
            </button>
          </div>

          {/* Blogs Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-xs text-slate-400 font-bold font-mono">Loading articles database...</p>
              </div>
            ) : filteredBlogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800/80 text-[12px] uppercase font-black tracking-widest text-slate-400">
                      <th className="px-6 py-4">আর্টিকেল ও শিরোনাম (Blog Details)</th>
                      <th className="px-6 py-4">ভিউজ (Views)</th>
                      <th className="px-6 py-4">অবস্থা (Visibility)</th>
                      <th className="px-6 py-4">তারিখ (Created At)</th>
                      <th className="px-6 py-4 text-right">অ্যাকশন (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredBlogs.map((blog) => (
                      <tr key={blog.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3 max-w-sm sm:max-w-md md:max-w-lg">
                            {blog.blogImageUrl ? (
                              <img 
                                src={blog.blogImageUrl} 
                                alt="" 
                                className="w-12 h-12 object-cover rounded-xl border border-slate-100 dark:border-slate-800 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="space-y-0.5 overflow-hidden">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white leading-snug truncate" title={blog.blogTitle}>
                                {blog.blogTitle}
                              </h4>
                              {blog.blogSummary ? (
                                <p className="text-[12px] text-slate-400 dark:text-slate-500 truncate">{blog.blogSummary}</p>
                              ) : null}
                              {blog.tags && blog.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {blog.tags.map((t, i) => (
                                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold font-mono">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                          {blog.blogViewCount || 0} views
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleVisibility(blog)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase cursor-pointer border transition-colors ${
                              blog.isBlogVisible 
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100"
                            }`}
                            title={blog.isBlogVisible ? "আর্টিকেলটি সবার থেকে হাইড করতে ক্লিক করুন" : "আর্টিকেলটি পাবলিক করতে ক্লিক করুন"}
                          >
                            {blog.isBlogVisible ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Published</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(blog)}
                              className="p-1.5 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/40 dark:hover:bg-slate-800 hover:text-blue-600 text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer transition-colors"
                              title="সম্পাদনা করুন (Edit)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(blog.id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800/40 dark:hover:bg-slate-800 hover:text-rose-600 text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer transition-colors"
                              title="ডিলিট করুন (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center max-w-sm mx-auto space-y-4">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">কোনো ব্লগ আর্টিকেল পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    সার্চ কুয়েরির সাথে মিলপূর্ণ অথবা সাধারণ কোনো আর্টিকেল খুঁজে পাওয়া যায়নি।
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
