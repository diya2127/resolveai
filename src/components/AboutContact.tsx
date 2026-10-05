import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Mail, Phone, MapPin, Star, ShieldAlert } from "lucide-react";

interface ContactProps {
  initialView: "about" | "contact";
}

export default function AboutContact({ initialView }: ContactProps) {
  const [activeTab, setActiveTab] = useState<"about" | "contact">(initialView);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General inquiry");
  const [message, setMessage] = useState("");
  const [isSent, setIsSent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    setIsSubmitting(true);
    try {
      await fetch("/api/complaints/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Website",
          senderName: name,
          senderEmail: email,
          subject: topic,
          message: message,
        }),
      });
    } catch (err) {
      console.warn("Could not dispatch website complaint to backend:", err);
    } finally {
      setIsSubmitting(false);
      setIsSent(true);
      setTimeout(() => {
        setName("");
        setEmail("");
        setTopic("General inquiry");
        setMessage("");
      }, 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Navigation Headers */}
      <div className="flex border-b border-slate-100 pb-px">
        <button
          onClick={() => { setActiveTab("about"); setIsSent(false); }}
          className={`px-6 py-3 font-display font-bold text-base border-b-2 -mb-px transition ${
            activeTab === "about"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-400 hover:text-brand-secondary"
          }`}
        >
          About ResolveAI
        </button>
        <button
          onClick={() => { setActiveTab("contact"); setIsSent(false); }}
          className={`px-6 py-3 font-display font-bold text-base border-b-2 -mb-px transition ${
            activeTab === "contact"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-400 hover:text-brand-secondary"
          }`}
        >
          Contact Us
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "about" ? (
          <motion.div
            key="about"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Core details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h2 className="font-display font-bold text-xl text-brand-secondary">The Intelligence Layer Behind Feedback</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  ResolveAI is an AI-powered feedback and issue intelligence platform built for modern organizations that receive thousands of customer signals every day — App Store reviews, CSAT surveys, live support tickets, and carrier ratings. Instead of leaving that feedback scattered in disconnected hubs, ResolveAI brings everything together into a unified system that reads, aggregates, and prioritizes it automatically.
                </p>
                
                <h3 className="font-display font-bold text-base text-brand-secondary pt-2">How the Core AI Engine Operates</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Every incoming signal is processed by a natural language pipeline that evaluates tone sentiment, extracts principal topics, and maps complaints against existing open issues to cluster redundancy. A neural severity metric then weighs how many total accounts are affected against the business liability, ensuring the most business-critical issues bubble up instantly for engineering attention rather than getting buried.
                </p>
              </div>

              {/* Benefits layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Rapid Turnaround", desc: "AI dispatches tickets to correct internal departments immediately, slashing SLA intervals." },
                  { title: "Pattern Clustering", desc: "Similar support issues are grouped automatically so teams fix root defects rather than symptoms." },
                  { title: "Clear Prioritization", desc: "Severity weighting guarantees business-critical payment or infrastructure locks are addressed first." },
                  { title: "Executive Visibility", desc: "Corporate leadership gains access to real-time status boards rather than retro quarterly spreadsheets." }
                ].map((item, i) => (
                  <div key={i} className="bg-brand-card p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-display font-bold text-sm text-brand-secondary">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack summary sidebar */}
            <div className="space-y-6">
              {/* Platform Compliance */}
              <div className="bg-brand-secondary text-white p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="p-2.5 bg-slate-800 rounded-xl w-fit text-brand-primary">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-lg">Platform Compliance</h3>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Our platform executes secure client credential audits, end-to-end token verification, and data encryption. ResolveAI respects enterprise privacy schemas and maintains a strictly isolated secure model execution scope.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-6 pt-4 border-t border-slate-800">
                  Secure Cluster • v3.11-Enterprise
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="contact"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Form */}
            <div className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="font-display font-bold text-lg text-brand-secondary mb-4">Send us a Message</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Email</label>
                    <input
                      required
                      type="email"
                      placeholder="you@company.com"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Topic</label>
                  <select
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                  >
                    <option>General inquiry</option>
                    <option>Technical integration support</option>
                    <option>Enterprise onboarding SLA</option>
                    <option>Feedback about ResolveAI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Description</label>
                  <textarea
                    required
                    placeholder="Describe how we can assist your organization..."
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none min-h-[120px]"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSent}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-primary hover:opacity-90 text-white font-semibold text-sm rounded-xl shadow-sm transition"
                >
                  {isSent ? "Sending Message..." : "Submit Message"}
                </button>

                <AnimatePresence>
                  {isSent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 p-4 bg-emerald-50 border border-emerald-100 text-brand-success text-xs rounded-xl flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Message sent successfully — our enterprise support team typically replies within one business day.
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>

            {/* Contact details list */}
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Corporate Support", value: "support@resolveai.in" },
                { icon: Phone, label: "Enterprise Line", value: "+91 1800 123 4567" },
                { icon: MapPin, label: "Headquarters", value: "ResolveAI Technologies Pvt. Ltd., Block C, Manyata Tech Park, Outer Ring Road, Bengaluru, Karnataka 560045" },
                { icon: Star, label: "Product Submissions", value: "Every ticket feed goes directly into our internal ResolveAI system queue." }
              ].map((item, i) => (
                <div key={i} className="bg-brand-card p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-start">
                  <div className="p-2 bg-brand-primary-soft rounded-lg text-brand-primary flex-shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</h4>
                    <p className="text-sm font-semibold text-brand-secondary mt-1">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
