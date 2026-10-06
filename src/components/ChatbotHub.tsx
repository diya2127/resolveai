import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, RefreshCw, Layers, Sliders, History, Mic, Paperclip } from "lucide-react";
import { User, ChatMessage } from "../types";

interface ChatbotHubProps {
  user: User;
}

const mockSessions = [
  { id: "s1", title: "Gateway Failure Audit", age: "2h ago" },
  { id: "s2", title: "Weekly Delivery Trends", age: "Yesterday" },
  { id: "s3", title: "Support Shift Suggestion", age: "3 days ago" }
];

export default function ChatbotHub({ user }: ChatbotHubProps) {
  const isAuthority = user.role === "authority";
  const bodyRef = useRef<HTMLDivElement>(null);

  // Core Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tone, setTone] = useState("analytical");
  const [useTickets, setUseTickets] = useState(true);
  const [useCategories, setUseCategories] = useState(true);
  const [useDb, setUseDb] = useState(true);

  // Initialize Welcome Message
  useEffect(() => {
    const userName = user.name.split(" ")[0];
    const greetingText = isAuthority
      ? `Welcome to the ResolveAI Intelligence Core, ${userName}. I'm your advanced chatbot agent. I have loaded active corporate contexts. Ask me to synthesize patterns, forecast volume trends, or draft strategic response directives.`
      : `Hello ${userName}, I'm your customer response assistant. I can help you draft highly empathetic replies, list standard operating procedures, or summarize your pending task queue. How can I help you today?`;

    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: greetingText,
        timestamp: new Date()
      }
    ]);
  }, [user, isAuthority]);

  // Scroll to bottom
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    // Clear input
    setInputValue("");

    // Add user message
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Show typing
    setIsTyping(true);

    try {
      // Call Express API route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          tone,
          role: user.role,
          context: {
            useTickets,
            useCategories,
            useDb
          }
        })
      });

      if (!response.ok) {
        throw new Error("Failed response from server");
      }

      const data = await response.json();
      
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: data.text,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.warn("Express endpoint error, using local fallback:", err);
      // Fallback
      setTimeout(() => {
        setIsTyping(false);
        const replyText = getLocalFallbackReply(query);
        setMessages(prev => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: replyText,
            timestamp: new Date()
          }
        ]);
      }, 1000);
    }
  };

  const getLocalFallbackReply = (text: string): string => {
    const t = text.toLowerCase();
    
    if (user.role === "employee") {
      if (t.includes("task") || t.includes("priority")) {
        return `### Assigned Workspace Queue Roadmap\n\nBased on ticket classifications, here is your target queue:\n1. **#4521 - Refund complaint escalation** (High Priority, SLA 2h left)\n2. **#4522 - Delivery terminal delay** (High Priority)\n3. **#4523 - Concurrent payment charges** (Medium Priority)\n\n*Suggestion: Resolve refund complaint #4521 first to clear critical credit hold.*`;
      }
      if (t.includes("refund") && (t.includes("reply") || t.includes("draft") || t.includes("delay"))) {
        return `### Draft: Empathetic Refund Delay Response\n\n"Subject: Important update regarding your refund — ResolveAI Support\n\nDear [Customer Name],\n\nI sincerely apologize for the delay in processing your credit. I fully understand how frustrating it is to wait for funds that belong to you.\n\nWe identified a gateway synchronization issue. I have manually authorized your refund, which will post in your account within 2-3 business days. Thank you for your immense patience."`;
      }
      if (t.includes("delivery") || t.includes("late")) {
        return `### Operational Guideline: Late Deliveries\n\n1. Check the shipping tracking ledger (DHL/Carrier logs).\n2. If the shipment is stuck >48 hours at a metropolitan terminal, open carrier ticket.\n3. Send the late delivery template to the customer.\n4. Log Carrier ID in task notes.`;
      }
      return `I've analyzed your support request. I can assist with:\n- Drafting customer responses\n- Outlining resolution workflows\n- Explaining duplicate charges (#A1092)\n\n*Tip: Configure your Gemini API key in Settings > Secrets for live real-time analysis.*`;
    } else {
      if (t.includes("major") || t.includes("today") || t.includes("issue") || t.includes("trend")) {
        return `### Live feedback Analysis & Anomalies (Today)\n\n1. **Payment Gateway Exceptions (Critical)**: 340 customer reports in 2 hours. Regional checkout success drops to 68%.\n2. **Logistics Terminal backing (High)**: 9,000 complaints cumulative. Sorting delay anomaly.\n3. **Android Client Auth Failure (Medium)**: Password resets failing. Sync patches active.`;
      }
      if (t.includes("department") || t.includes("performance") || t.includes("sla")) {
        return `### Department Resolution Metrics:\n- **Customer Support**: 88% resolution (Meets SLA)\n- **Accounts & Billing**: 82% resolution (Meets SLA)\n- **Finance / Refunds**: 65% resolution (🚨 15% Below Target backlogs)\n\n*Action: Automate refund releases to bypass ledger sync backlogs.*`;
      }
      return `I am ResolveAI's Corporate Chatbot. I can generate:\n- SLA performance tables\n- Volume anomaly diagnostics\n- Strategic recommendations\n\n*Tip: Connect your live Gemini API key in Settings > Secrets for tailored recommendations.*`;
    }
  };

  const handleResetChat = () => {
    if (confirm("Reset current Chatbot session?")) {
      const userName = user.name.split(" ")[0];
      setMessages([
        {
          id: `reset-${Date.now()}`,
          sender: "bot",
          text: `Session re-initialized. Ready to process feedback intelligence, ${userName}.`,
          timestamp: new Date()
        }
      ]);
    }
  };

  const loadHistorySession = (title: string) => {
    setIsTyping(true);
    setMessages(prev => [
      ...prev,
      {
        id: `hist-req-${Date.now()}`,
        sender: "user",
        text: `Retrieve context and diagnostic logs for "${title}"`,
        timestamp: new Date()
      }
    ]);

    setTimeout(() => {
      setIsTyping(false);
      let content = "";
      if (title === "Gateway Failure Audit") {
        content = `### Archive Retrieval: Gateway Failure Audit (2 hours ago)
• **Affected Scope:** 340 checkout tickets
• **Root Cause:** Gateway timeouts returning HTTP 504 errors on capturing transactions.
• **Action taken:** Escalated to Platform Engineering. Recommended displaying fallback alert on checkout pages to prevent duplicated payments.`;
      } else if (title === "Weekly Delivery Trends") {
        content = `### Archive Retrieval: Weekly Delivery Trends
• **Affected Scope:** 9,000 carrier complaints
• **Analysis:** Slowdown centered at the regional metropolitan cargo terminal. Mapped a routing delay anomaly.
• **Action taken:** Dynamic shipping redirections applied to regional express alternatives.`;
      } else {
        content = `### Archive Retrieval: Support Shift Suggestion
• **Affected Scope:** Staffing Allocation SLA
• **Analysis:** Response bottlenecks verified during peak hours (6 PM - 9 PM) reaching average delay of 5.4 hours.
• **Action taken:** Suggested shift restructuring. Mapped a projected 22% delay reduction.`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `hist-res-${Date.now()}`,
          sender: "bot",
          text: content,
          timestamp: new Date()
        }
      ]);
    }, 800);
  };

  // Quick Action templates
  const templates = isAuthority
    ? [
        { label: "Analyze Delivery Bottlenecks", prompt: "Identify regional bottlenecks in late delivery feedback logs" },
        { label: "Synthesize Payment Failures", prompt: "Perform technical audit on 340 payment gateway checkout timeouts" },
        { label: "Forecast Support Staffing", prompt: "Review customer support times and optimize evening shift scheduling" },
        { label: "Audit Refund SLA Delays", prompt: "Identify root causes for refunds taking over 15 days" }
      ]
    : [
        { label: "Draft Refund Delay Reply", prompt: "Draft empathetic customer response template for a refund delay issue" },
        { label: "Explain Late Delivery Fix", prompt: "List standard procedures to investigate and resolve late delivery logs" },
        { label: "Help with Duplicate Charge", prompt: "How do I resolve double capture duplicate charges on order #A1092?" },
        { label: "Prioritize My Task Queue", prompt: "List my active queue tasks sorted by corporate priority and severity" }
      ];

  // Suggestion chips
  const suggestionChips = isAuthority
    ? ["Analyze current major issues", "Department SLA report", "Any critical alerts?"]
    : ["What are my active tasks?", "SOP for late delivery", "Help resolving refund delays"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-130px)] min-h-[500px]"
    >
      {/* LEFT: MAIN CHAT PANEL */}
      <div className="lg:col-span-3 flex flex-col bg-brand-card rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-display font-bold text-sm">
              AI
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-brand-secondary">ResolveAI Chatbot</h2>
              <span className="text-[10px] text-slate-400 font-medium">Model: gemini-3.8-flash • Full Context Scope</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-primary-soft border border-brand-primary/20 rounded-full text-brand-primary font-mono text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary pulse-dot" />
              Connected
            </div>
            <button
              onClick={handleResetChat}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-brand-secondary transition"
              title="Reset Chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-brand-primary text-white"
                  }`}
                >
                  {msg.sender === "user" ? user.name.charAt(0) : "AI"}
                </div>
                <div className="space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-brand-primary text-white rounded-tr-none"
                        : "bg-brand-card border border-slate-100 text-brand-secondary rounded-tl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className={`text-[9px] text-slate-400 block font-mono ${
                    msg.sender === "user" ? "text-right" : "text-left"
                  }`}>
                    {msg.sender === "user" ? "You" : "ResolveAI core"} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 mr-auto max-w-[80%] items-center">
                <div className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  AI
                </div>
                <div className="bg-brand-card border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Input Footer */}
        <div className="p-4 border-t border-slate-100 bg-brand-card space-y-3">
          {/* horizontal chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 text-xs px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full text-slate-500 hover:text-brand-secondary font-medium transition"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-brand-primary focus-within:bg-white transition-all">
            <input
              type="text"
              placeholder="Ask ResolveAI Chatbot to write reports, look up signals, or draft responses..."
              className="flex-1 bg-transparent border-none outline-none text-sm p-1.5 text-brand-secondary placeholder-slate-400"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => alert("Microphone context capturing is a feature placeholder.")}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                title="Voice Input"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => alert("Document context loading is a feature placeholder.")}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
                title="Attach Document Context"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage()}
                className="p-2 rounded-xl bg-brand-primary text-white hover:opacity-90 shadow-sm shadow-brand-primary/10 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: CONFIG / CONSOLE PANEL */}
      <div className="space-y-4 flex flex-col h-full overflow-y-auto pr-1">
        {/* Quick templates menu */}
        <div className="bg-brand-card p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            Quick AI Tasks
          </h3>
          <div className="space-y-2">
            {templates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(tpl.prompt)}
                className="w-full text-left p-3 bg-slate-50/50 hover:bg-brand-primary-soft/50 border border-slate-100 hover:border-brand-primary/20 rounded-xl transition group"
              >
                <strong className="text-xs font-display font-bold text-slate-600 group-hover:text-brand-primary block">{tpl.label}</strong>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-1">{tpl.prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Param configurations */}
        <div className="bg-brand-card p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-brand-primary" />
            Chatbot Parameters
          </h3>
          
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Output Style Tone</label>
              <select
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-brand-primary outline-none"
                value={tone}
                onChange={e => setTone(e.target.value)}
              >
                <option value="analytical">Data Analyst (Fact-heavy)</option>
                <option value="empathetic">Support Coach (Polite/Replies)</option>
                <option value="actionable">Action-Oriented (Checklists)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Connected Contexts</label>
              <div className="space-y-1">
                {[
                  { state: useTickets, setter: setUseTickets, label: "Live Feedback logs" },
                  { state: useCategories, setter: setUseCategories, label: "Category Analytics" },
                  { state: useDb, setter: setUseDb, label: "Department Performance DB" }
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={e => item.setter(e.target.checked)}
                      className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History session log preloads */}
        <div className="bg-brand-card p-4 rounded-2xl border border-slate-100 shadow-sm flex-1 space-y-3 min-h-[140px]">
          <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-brand-primary" />
            Archived Audit Sessions
          </h3>
          <div className="space-y-1.5">
            {mockSessions.map(sess => (
              <button
                key={sess.id}
                onClick={() => loadHistorySession(sess.title)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition text-xs font-semibold text-slate-600 group"
              >
                <span className="group-hover:text-brand-primary truncate max-w-[150px]">{sess.title}</span>
                <span className="text-[9px] text-slate-400 font-mono shrink-0">{sess.age}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
