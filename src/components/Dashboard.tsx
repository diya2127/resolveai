import { useState, Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import {
  CheckCircle,
  Clock,
  ChevronDown,
  Check,
  Save,
  TrendingDown,
  User,
  MessageCircle,
  Mail,
  ShoppingBag,
  Globe,
  Sparkles,
  RefreshCw,
  Search,
} from "lucide-react";
import { User as UserType, Task, TaskPriority, TaskStatus } from "../types";

interface DashboardProps {
  user: UserType;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
}

export default function Dashboard({ user, tasks, setTasks }: DashboardProps) {
  const [activeNotes, setActiveNotes] = useState<{ [key: string]: string }>({});
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drafts, setDrafts] = useState<{ [key: string]: string }>({});
  const [draftLoading, setDraftLoading] = useState<{ [key: string]: boolean }>({});
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  const handleGenerateDraft = async (task: Task) => {
    setDraftLoading(prev => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch("/api/complaints/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: task.senderName || "Customer",
          message: task.desc,
          channel: task.source || "WhatsApp",
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setDrafts(prev => ({ ...prev, [task.id]: data.draft }));
        setActiveNotes(prev => ({ ...prev, [task.id]: data.draft }));
        // Open notes drawer to show the draft
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, notesOpen: true } : t));
      }
    } catch (e) {
      console.warn("Failed to generate AI draft:", e);
    } finally {
      setDraftLoading(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const handleCopyDraft = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2500);
  };

  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSendOutboundWhatsApp = async (task: Task, text: string) => {
    const phone = task.senderPhone || (task.senderName?.match(/\+?\d[\d\s-]{8,}/) ? task.senderName : null);
    if (!phone) {
      alert("No customer phone number found on this ticket to send WhatsApp message.");
      return;
    }

    setSendingId(task.id);
    try {
      const res = await fetch("/api/whatsapp/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone: phone,
          message: text,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSentSuccessId(task.id);
        handleSaveNotes(task.id, `Dispatched reply to WhatsApp: "${text.substring(0, 45)}..."`);
        setTimeout(() => setSentSuccessId(null), 4000);
      } else {
        alert(data.error || "Failed to dispatch WhatsApp reply. Please ensure Twilio is configured.");
      }
    } catch (e: any) {
      alert(e.message || "Network error dispatching WhatsApp reply.");
    } finally {
      setSendingId(null);
    }
  };

  const handleAcceptTask = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "In Progress" } : t));
    try {
      await fetch(`/api/tasks/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "In Progress" }),
      });
    } catch (err) {
      console.warn("Could not synchronize task status with backend:", err);
    }
  };

  const handleResolveTask = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "Resolved" } : t));
    try {
      await fetch(`/api/tasks/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      });
    } catch (err) {
      console.warn("Could not synchronize task resolution with backend:", err);
    }
  };

  const handleToggleNotes = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notesOpen: !t.notesOpen } : t));
  };

  const handleSaveNotes = async (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes: text, notesOpen: false } : t));
    try {
      await fetch(`/api/tasks/${encodeURIComponent(id)}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
    } catch (err) {
      console.warn("Could not persist note update to backend:", err);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "High":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-red-50 text-brand-danger border border-red-100">High Priority</span>;
      case "Medium":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-amber-50 text-brand-warning border border-amber-100">Medium</span>;
      case "Low":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-slate-100 text-slate-500 border border-slate-200">Routine</span>;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "Resolved":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-emerald-50 text-brand-success border border-emerald-100">Resolved</span>;
      case "In Progress":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-brand-primary-soft text-brand-primary border border-brand-primary/25">In Progress</span>;
      case "Pending":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-slate-100 text-slate-500 border border-slate-200">Pending</span>;
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== "Resolved");
  const completedCount = tasks.filter(t => t.status === "Resolved").length;

  const waCount = tasks.filter(t => (t.source || "").toLowerCase().includes("whatsapp")).length;
  const gmCount = tasks.filter(t => (t.source || "").toLowerCase().includes("gmail")).length;
  const ecCount = tasks.filter(t => (t.source || "").toLowerCase().includes("commerce")).length;
  const wbCount = tasks.filter(t => (t.source || "").toLowerCase().includes("web")).length;

  const filteredTasks = tasks.filter(task => {
    // Channel filter
    if (channelFilter === "whatsapp" && !(task.source || "").toLowerCase().includes("whatsapp")) return false;
    if (channelFilter === "gmail" && !(task.source || "").toLowerCase().includes("gmail")) return false;
    if (channelFilter === "ecommerce" && !(task.source || "").toLowerCase().includes("commerce")) return false;
    if (channelFilter === "website" && !(task.source || "").toLowerCase().includes("web")) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        task.title.toLowerCase().includes(q) ||
        task.desc.toLowerCase().includes(q) ||
        (task.senderName || "").toLowerCase().includes(q) ||
        (task.senderEmail || "").toLowerCase().includes(q) ||
        (task.category || "").toLowerCase().includes(q) ||
        (task.id || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Welcome & Role Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-secondary md:text-3xl">
            Workspace Ticket Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong>{user.name}</strong> • Live feedback incoming from WhatsApp, Gmail, E-Commerce &amp; Web
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-brand-success rounded-xl">
            <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
            Live Sync Active
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Tickets", value: pendingTasks.length, delta: `${tasks.filter(t => t.priority === "High" && t.status !== "Resolved").length} high priority`, icon: Clock, iconColor: "text-amber-600 bg-amber-50" },
          { label: "Resolved Tickets", value: completedCount, delta: "Closed tickets", icon: CheckCircle, iconColor: "text-brand-success bg-emerald-50" },
          { label: "WhatsApp Tickets", value: waCount, delta: "Incoming mobile chats", icon: MessageCircle, iconColor: "text-emerald-600 bg-emerald-50" },
          { label: "Gmail Tickets", value: gmCount, delta: "Customer support emails", icon: Mail, iconColor: "text-red-600 bg-red-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-card p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
              <h2 className="font-display font-bold text-3xl text-brand-secondary mt-2">{stat.value}</h2>
              <span className="text-xs text-slate-400 font-medium block mt-1">{stat.delta}</span>
            </div>
            <div className={`p-2.5 rounded-xl ${stat.iconColor}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Queue Task List Area */}
      <div className="space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-brand-card rounded-2xl border border-slate-200/80 shadow-xs">
          
          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: `All Tickets (${tasks.length})`, icon: Sparkles },
              { id: "whatsapp", label: `WhatsApp (${waCount})`, icon: MessageCircle },
              { id: "gmail", label: `Gmail (${gmCount})`, icon: Mail },
              { id: "ecommerce", label: `E-Commerce (${ecCount})`, icon: ShoppingBag },
              { id: "website", label: `Website (${wbCount})`, icon: Globe },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = channelFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setChannelFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search sender, topic, ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Tickets Grid */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-brand-card rounded-2xl border border-slate-200/80 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No tickets matching filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {channelFilter !== "all" ? `No tickets found under ${channelFilter}. Try switching to "All Tickets".` : "No tickets currently in the database."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className="bg-brand-card rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 hover:border-brand-primary/40 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{task.id}</span>
                      
                      {task.source && (
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1.5 ${
                          (task.source || "").toLowerCase().includes("whatsapp") ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          (task.source || "").toLowerCase().includes("gmail") ? "bg-red-50 text-red-700 border-red-200" :
                          (task.source || "").toLowerCase().includes("commerce") ? "bg-purple-50 text-purple-700 border-purple-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          <span>{(task.source || "").toLowerCase().includes("whatsapp") ? "💬" : (task.source || "").toLowerCase().includes("gmail") ? "📧" : (task.source || "").toLowerCase().includes("commerce") ? "🛒" : "🌐"}</span>
                          <span>{task.source}</span>
                        </span>
                      )}

                      {task.category && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-md">
                          {task.category}
                        </span>
                      )}

                      <h4 className="font-display font-bold text-base text-brand-secondary">{task.title}</h4>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed pt-1">{task.desc}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                      {task.senderName && (
                        <div>
                          <span className="font-semibold text-slate-700">From: {task.senderName}</span>
                          {task.senderEmail && <span className="text-slate-400 ml-1">({task.senderEmail})</span>}
                        </div>
                      )}
                      {task.employeeName && (
                        <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <span>Assigned Agent: <strong>{task.employeeName}</strong></span>
                          {task.department && <span className="text-slate-400">({task.department})</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap items-center shrink-0">
                    {getPriorityBadge(task.priority)}
                    {getStatusBadge(task.status)}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {task.status === "Pending" && (
                      <button
                        onClick={() => handleAcceptTask(task.id)}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept Task
                      </button>
                    )}
                    {task.status === "In Progress" && (
                      <button
                        onClick={() => handleResolveTask(task.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleNotes(task.id)}
                      className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {task.notesOpen ? "Close Notes" : "Add/Edit Note"}
                      <ChevronDown className={`w-3 h-3 transition-transform ${task.notesOpen ? "rotate-180" : ""}`} />
                    </button>

                    <button
                      onClick={() => handleGenerateDraft(task)}
                      disabled={draftLoading[task.id]}
                      className="px-3.5 py-2 bg-brand-primary-soft hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Generate AI reply for customer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${draftLoading[task.id] ? "animate-spin" : ""}`} />
                      <span>{draftLoading[task.id] ? "Drafting..." : "AI Draft Reply"}</span>
                    </button>
                  </div>

                  {task.notes && (
                    <span className="text-xs font-mono text-slate-400 max-w-xs truncate">
                      Latest: "{task.notes}"
                    </span>
                  )}
                </div>

                {/* Expanded Notes Section */}
                {task.notesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pt-3 border-t border-dashed border-slate-200 space-y-3"
                  >
                    {drafts[task.id] && (
                      <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                            AI Suggested Reply for {task.source || "Customer"}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyDraft(drafts[task.id], task.id)}
                              className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                            >
                              {copiedDraftId === task.id ? "✓ Copied!" : "Copy Text"}
                            </button>

                            {(task.source || "").toLowerCase().includes("whatsapp") && (
                              <button
                                type="button"
                                onClick={() => handleSendOutboundWhatsApp(task, drafts[task.id])}
                                disabled={sendingId === task.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {sendingId === task.id ? (
                                  <span>Sending...</span>
                                ) : sentSuccessId === task.id ? (
                                  <span>✓ Dispatched!</span>
                                ) : (
                                  <>
                                    <MessageCircle className="w-3 h-3" />
                                    <span>Send via WhatsApp</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-700 italic leading-relaxed whitespace-pre-wrap">
                          "{drafts[task.id]}"
                        </p>
                      </div>
                    )}

                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Diagnostic &amp; Resolution Note</label>
                    <textarea
                      placeholder="Type diagnostic findings, customer response, or system resolution logs..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none min-h-[75px]"
                      value={activeNotes[task.id] !== undefined ? activeNotes[task.id] : (task.notes || "")}
                      onChange={e => setActiveNotes({ ...activeNotes, [task.id]: e.target.value })}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveNotes(task.id, activeNotes[task.id] !== undefined ? activeNotes[task.id] : (task.notes || ""))}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3 h-3" /> Save Note
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
