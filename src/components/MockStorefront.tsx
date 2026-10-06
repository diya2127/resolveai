import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  Star,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Send,
  Sparkles,
  Package,
  Headphones,
  Watch,
  Footprints,
  Tv,
  Keyboard,
  RotateCcw,
  Clock,
  ExternalLink,
  MessageSquare,
  HelpCircle
} from "lucide-react";

interface MockStorefrontProps {
  onNavigateToQueue: () => void;
  onRefreshTasks?: () => void;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  rating: number;
  reviewsCount: number;
  icon: any;
  tag: string;
  inStock: boolean;
  description: string;
}

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Sony WH-1000XM5 Wireless Headphones",
    category: "Audio & Acoustics",
    price: "₹26,990",
    rating: 4.6,
    reviewsCount: 342,
    icon: Headphones,
    tag: "Best Seller",
    inStock: true,
    description: "Industry-leading active noise cancelling with dual processors and 8 microphones.",
  },
  {
    id: "prod-2",
    name: "ApexFit Pro GPS Smartwatch",
    category: "Wearables & Health",
    price: "₹7,999",
    rating: 4.2,
    reviewsCount: 189,
    icon: Watch,
    tag: "Trending",
    inStock: true,
    description: "Always-on AMOLED display with heart rate, SpO2, sleep tracking, and 7-day battery life.",
  },
  {
    id: "prod-3",
    name: "RoboClean X1 Laser Vacuum",
    category: "Home Appliances",
    price: "₹18,499",
    rating: 3.8,
    reviewsCount: 95,
    icon: Tv,
    tag: "Sale 20% Off",
    inStock: true,
    description: "3000Pa suction with LiDAR navigation, auto-recharge, and dual wet-dry mopping pads.",
  },
  {
    id: "prod-4",
    name: "AeroGlide Speed Cushion Running Shoes",
    category: "Footwear & Sports",
    price: "₹4,299",
    rating: 4.7,
    reviewsCount: 512,
    icon: Footprints,
    tag: "Top Rated",
    inStock: true,
    description: "Ultra-responsive nitrogen-infused foam midsole for maximum energy return and marathon durability.",
  },
  {
    id: "prod-5",
    name: "KeyChron Mechanical RGB Gaming Keyboard",
    category: "Computer Peripherals",
    price: "₹6,899",
    rating: 4.4,
    reviewsCount: 140,
    icon: Keyboard,
    tag: "Popular",
    inStock: true,
    description: "Hot-swappable mechanical switches with wireless Bluetooth 5.1 and macOS/Windows layout.",
  },
];

export default function MockStorefront({ onNavigateToQueue, onRefreshTasks }: MockStorefrontProps) {
  const [activeFormType, setActiveFormType] = useState<"review" | "complaint">("review");
  const [selectedProduct, setSelectedProduct] = useState<Product>(mockProducts[0]);

  // Review form state
  const [reviewRating, setReviewRating] = useState<number>(1);
  const [reviewerName, setReviewerName] = useState<string>("Diya Suthar");
  const [reviewerEmail, setReviewerEmail] = useState<string>("diya.customer@example.com");
  const [reviewText, setReviewText] = useState<string>(
    "The product arrived with cracked plastic packaging and the left side does not turn on. Extremely disappointed with quality control!"
  );

  // Formal complaint form state
  const [orderId, setOrderId] = useState<string>("ORD-84920");
  const [complaintCategory, setComplaintCategory] = useState<string>("Delivery Delay");
  const [complaintName, setComplaintName] = useState<string>("Rohit Verma");
  const [complaintEmail, setComplaintEmail] = useState<string>("rohit.verma@example.com");
  const [complaintPhone, setComplaintPhone] = useState<string>("+91 98765 12345");
  const [complaintSubject, setComplaintSubject] = useState<string>("Package delayed over 7 days with no tracking updates");
  const [complaintDetails, setComplaintDetails] = useState<string>(
    "My delivery was promised for Tuesday, but status has been stuck at the regional hub for 7 days. Need an urgent status or immediate cancellation and refund."
  );

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    taskId?: number | string;
    department?: string;
    employeeName?: string;
    summary?: string;
    severity?: string;
    message: string;
  } | null>(null);

  // Handle Review Submission
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await fetch("/api/complaints/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "E-Commerce",
          senderName: reviewerName,
          senderEmail: reviewerEmail,
          product: selectedProduct.name,
          rating: reviewRating,
          subject: `${reviewRating}★ Review on ${selectedProduct.name}`,
          message: reviewText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmissionResult({
          success: true,
          taskId: data.data?.taskId || "#New",
          department: data.data?.assignedEmployeeName ? "Assigned Specialist" : "Support Operations",
          employeeName: data.data?.assignedEmployeeName || "Queue Specialist",
          summary: data.data?.analysis?.summary || reviewText,
          severity: data.data?.analysis?.severity || (reviewRating <= 2 ? "High" : "Routine"),
          message:
            reviewRating <= 2
              ? `Low review (${reviewRating}★) captured! ResolveAI flagged this as a critical customer issue and assigned it to ${data.data?.assignedEmployeeName || "Support"}.`
              : `Review submitted! Positive customer sentiment recorded in feedback history.`,
        });

        if (onRefreshTasks) onRefreshTasks();
      } else {
        setSubmissionResult({
          success: false,
          message: data.error || "Failed to submit review to pipeline.",
        });
      }
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        message: err.message || "Network error submitting to ResolveAI pipeline.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Formal Complaint Submission
  const handleSubmitComplaint = async (e: FormEvent) => {
    e.preventDefault();
    if (!complaintDetails.trim()) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await fetch("/api/complaints/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Website",
          senderName: complaintName,
          senderEmail: complaintEmail,
          senderPhone: complaintPhone,
          product: selectedProduct.name,
          subject: `[Order #${orderId}] ${complaintSubject}`,
          message: complaintDetails,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmissionResult({
          success: true,
          taskId: data.data?.taskId || "#New",
          department: data.data?.analysis?.category || complaintCategory,
          employeeName: data.data?.assignedEmployeeName || "Operations Specialist",
          summary: data.data?.analysis?.summary || complaintDetails,
          severity: data.data?.analysis?.severity || "High",
          message: `Complaint registered! Ticket #${data.data?.taskId} auto-assigned to ${data.data?.assignedEmployeeName || "Agent"}.`,
        });

        if (onRefreshTasks) onRefreshTasks();
      } else {
        setSubmissionResult({
          success: false,
          message: data.error || "Failed to register complaint.",
        });
      }
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        message: err.message || "Network error registering complaint.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Mock Storefront Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-brand-primary/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-primary/20 border border-brand-primary/40 text-brand-primary text-xs font-mono font-bold uppercase tracking-wider rounded-full">
                Mock E-Commerce Storefront
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live ResolveAI Ingestion Hooked
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              ApexMart • Electronics &amp; Lifestyle Store
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              This is a live mock customer storefront. When customers submit reviews (especially 1★ or 2★) or file order complaints here, ResolveAI immediately runs Gemini AI triage, assigns an employee, and places the ticket in your Workspace Queue.
            </p>
          </div>

          <button
            onClick={onNavigateToQueue}
            className="self-start md:self-center px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>View Internal Helpdesk Queue</span>
            <ArrowRight className="w-4 h-4 text-brand-primary" />
          </button>
        </div>
      </div>

      {/* Main Storefront & Testing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Product Catalog Grid */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-primary" />
              <span>Select Product to Test</span>
            </h2>
            <span className="text-xs text-slate-500">{mockProducts.length} Products</span>
          </div>

          <div className="space-y-3">
            {mockProducts.map((prod) => {
              const IconComp = prod.icon;
              const isSelected = selectedProduct.id === prod.id;
              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white border-brand-primary shadow-md ring-2 ring-brand-primary/20"
                      : "bg-brand-card border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-brand-primary text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider truncate">
                          {prod.tag}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900">{prod.price}</span>
                      </div>

                      <h3 className="font-bold text-xs text-slate-900 truncate">{prod.name}</h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{prod.description}</p>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {prod.rating}
                        </span>
                        <span>•</span>
                        <span>{prod.reviewsCount} reviews</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Action Desk (Write Review or File Dispute) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-card p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            
            {/* Header of Action Desk */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-[11px] font-bold text-brand-primary uppercase tracking-wider">
                  Storefront Customer Portal
                </span>
                <h2 className="font-display font-bold text-lg text-slate-900 mt-0.5">
                  Simulate Live Customer Input
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Selected Target: <strong className="text-slate-800">{selectedProduct.name}</strong>
                </p>
              </div>

              {/* Toggle Form Type */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveFormType("review")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeFormType === "review"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Product Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFormType("complaint")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeFormType === "complaint"
                      ? "bg-white text-red-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Order Dispute / Complaint</span>
                </button>
              </div>
            </div>

            {/* FORM 1: PRODUCT REVIEW FORM */}
            {activeFormType === "review" && (
              <form onSubmit={handleSubmitReview} className="space-y-5">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>How ResolveAI Reviews Ingestion Works</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Reviews rated <strong>1★ or 2★</strong> automatically trigger an AI sentiment alert, extract the defect reason, classify the severity, and route a high-priority ticket straight to your internal queue.
                  </p>
                </div>

                {/* Rating Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Customer Star Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          reviewRating === star
                            ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${reviewRating >= star ? "fill-current" : ""}`} />
                        <span>{star} Star{star > 1 ? "s" : ""}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Email</label>
                    <input
                      type="email"
                      value={reviewerEmail}
                      onChange={(e) => setReviewerEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Customer Review Details</label>
                    <span className="text-[10px] text-slate-400">Describe friction or satisfaction</span>
                  </div>
                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-mono text-slate-400">Source: E-Commerce Review</span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "Ingesting..." : "Post Review to ApexMart"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 2: FORMAL DISPUTE / COMPLAINT FORM */}
            {activeFormType === "complaint" && (
              <form onSubmit={handleSubmitComplaint} className="space-y-5">
                <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl text-xs text-red-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Direct Web Helpdesk Submission</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Formal customer complaints submitted via the website bypass public review boards and stream into ResolveAI with highest SLA tracking and immediate department assignment.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Order Number</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dispute Category</label>
                    <select
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    >
                      <option value="Delivery Delay">Delivery Delayed (&gt; 5 days)</option>
                      <option value="Damaged Product">Damaged or Broken Item</option>
                      <option value="Refund Issue">Refund Uncredited</option>
                      <option value="Payment Discrepancy">Double Charged / Payment Error</option>
                      <option value="Defective Unit">Defective Unit (Dead on Arrival)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={complaintPhone}
                      onChange={(e) => setComplaintPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name</label>
                    <input
                      type="text"
                      value={complaintName}
                      onChange={(e) => setComplaintName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer Email</label>
                    <input
                      type="email"
                      value={complaintEmail}
                      onChange={(e) => setComplaintEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Complaint Subject</label>
                  <input
                    type="text"
                    value={complaintSubject}
                    onChange={(e) => setComplaintSubject(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                  <textarea
                    rows={3}
                    value={complaintDetails}
                    onChange={(e) => setComplaintDetails(e.target.value)}
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-mono text-slate-400">Source: Website Support Desk</span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "Ingesting..." : "File Complaint to ResolveAI"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUBMISSION FEEDBACK CARD */}
            {submissionResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border text-xs space-y-3 ${
                  submissionResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : "bg-red-50 border-red-200 text-red-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {submissionResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span>{submissionResult.message}</span>
                  </div>
                  {submissionResult.taskId && (
                    <span className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800 text-xs">
                      Ticket #{submissionResult.taskId}
                    </span>
                  )}
                </div>

                {submissionResult.success && (
                  <div className="pt-2 border-t border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-emerald-800 space-y-0.5">
                      <div>
                        Assigned To: <strong>{submissionResult.employeeName}</strong> ({submissionResult.department})
                      </div>
                      <div>
                        Severity: <strong>{submissionResult.severity}</strong> • AI Analysis Complete
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onNavigateToQueue}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <span>Open Live in Queue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
