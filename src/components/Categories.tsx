import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { Category } from "../types";

const categories: Category[] = [
  { icon: "📦", name: "Product Quality Issues", total: 12400, repeated: 5100, sev: "med", ai: "Most complaints relate to items not matching listed catalog descriptions or arriving without components." },
  { icon: "🚚", name: "Logistics & Delivery", total: 15000, repeated: 9000, sev: "high", ai: "Most users complain about delayed shipping times and lack of carrier responsiveness in metro centers." },
  { icon: "💳", name: "Payment & Gateway Exceptions", total: 6200, repeated: 3400, sev: "crit", ai: "Recurring checkout transaction failures are traced to third-party secure token timeout database locks." },
  { icon: "↩️", name: "Refund & Compensation", total: 8100, repeated: 4700, sev: "med", ai: "Refund delays averaging 15+ business days remain the leading qualitative driver of customer dissatisfaction." },
  { icon: "🎧", name: "Customer Support Delays", total: 5300, repeated: 1900, sev: "low", ai: "Live support wait times spike heavily during peak early evening slots, specifically 6 PM to 9 PM." },
  { icon: "⚙️", name: "Platform Technical Glitches", total: 4100, repeated: 2200, sev: "med", ai: "App freeze logs clustered significantly following the v2.4.1 binary update, mostly on Android OS." },
  { icon: "🔐", name: "Accounts & Authentication", total: 3900, repeated: 2600, sev: "high", ai: "Sync mismatches prevent customers from logging into saved profiles, forcing redundant account resets." }
];

export default function Categories() {
  const getSeverityBadge = (s: Category["sev"]) => {
    switch (s) {
      case "crit":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-red-50 text-red-600 border border-red-100">Critical</span>;
      case "high":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-50 text-brand-warning border border-amber-100">High</span>;
      case "med":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-brand-primary-soft text-brand-primary border border-brand-primary/20">Medium</span>;
      case "low":
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-slate-100 text-slate-500 border border-slate-200">Low</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-secondary md:text-3xl">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time grouping of natural language customer feedback into operational categories</p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          7 active categories detected
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((c, idx) => (
          <div key={idx} className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl" role="img" aria-label={c.name}>{c.icon}</span>
                {getSeverityBadge(c.sev)}
              </div>
              <h3 className="font-display font-bold text-base text-brand-secondary">{c.name}</h3>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Total Signals</span>
                  <span className="font-mono font-bold text-brand-secondary">{c.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Identified Pattern Repeats</span>
                  <span className="font-mono font-bold text-slate-500">{c.repeated.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis Block */}
            <div className="p-3 bg-brand-primary-soft/60 rounded-xl border border-brand-primary/10 text-xs">
              <div className="flex items-center gap-1 text-brand-primary font-bold uppercase tracking-wider text-[10px] mb-1">
                <Sparkles className="w-3 h-3" />
                AI Category Assessment
              </div>
              <p className="text-slate-600 leading-relaxed">{c.ai}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
