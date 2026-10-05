import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, ChatMessage, Task } from "../types";

interface ChatWidgetProps {
  user: User;
  tasks: Task[];
}

export default function ChatWidget({ user, tasks }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Initialize Greeting
  useEffect(() => {
    const name = user.name.split(" ")[0];
    const greeting = user.role === "authority"
      ? `Hi ${name} — I'm your ResolveAI assistant. Ask me about today's major issues, department SLA metrics, or ask me to draft summary logs.`
      : `Hi ${name} — I'm your ResolveAI helper. Ask me what task queue items are assigned today, or walk through how to resolve a support complaint.`;
    
    setMessages([
      {
        id: "w-greet",
        sender: "bot",
        text: greeting,
        timestamp: new Date()
      }
    ]);
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    setInputValue("");

    const userMsg: ChatMessage = {
      id: `w-u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Call backend intelligence route
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          tone: "actionable",
          role: user.role,
          context: {
            useTickets: true,
            useCategories: true,
            useDb: true,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setMessages(prev => [
            ...prev,
            {
              id: `w-b-${Date.now()}`,
              sender: "bot",
              text: data.text,
              timestamp: new Date(),
            },
          ]);
          return;
        }
      }
    } catch (e) {
      console.warn("Backend chat failed, using fallback:", e);
    }

    // Fallback reply logic
    setTimeout(() => {
      let reply = "";
      const t = query.toLowerCase();

      if (user.role === "employee") {
        if (t.includes("task") && (t.includes("today") || t.includes("what") || t.includes("queue"))) {
          const pending = tasks.filter(x => x.status !== "Resolved").slice(0, 3);
          if (pending.length === 0) {
            reply = "You don't have any outstanding pending tasks today! Wonderful work.";
          } else {
            reply = "Your pending active tasks:\n" + pending.map((x, i) => `${i + 1}. ${x.title} (${x.priority} priority)`).join("\n");
          }
        } else if (t.includes("refund")) {
          reply = "For refund delay complaints: verify the ledger transaction ID first, manually authorize if sync fails, and inform customer that credit releases standardly within 2-3 business days.";
        } else if (t.includes("week") || t.includes("summary")) {
          const resolvedCount = tasks.filter(x => x.status === "Resolved").length;
          reply = `Your weekly tracker: ${resolvedCount} task(s) resolved, ${tasks.length - resolvedCount} remaining open. Performance trends are currently strong.`;
        } else {
          reply = "I can guide you on active queue items, give standard resolution steps for duplicate charges or late deliveries, or summarize your weekly stats. Ask me anything.";
        }
      } else {
        if (t.includes("major") || t.includes("today") || t.includes("issue") || t.includes("trend")) {
          reply = "Top corporate anomalies today:\n1. Payment Gateway Checkouts (Critical — 340 reports/2h)\n2. Late Deliveries (High — 9,000 reports)\n3. Account Resets (High — 800 reports)";
        } else if (t.includes("department") || t.includes("performance") || t.includes("sla")) {
          reply = "Department SLA Tracker:\n• Support Delays: 88% resolved\n• Accounts Reset: 82% resolved\n• Logistics Delay: 78% resolved\n• Finance/Refund Delays: 65% resolved (🚨 backlog warning)";
        } else if (t.includes("critical") || t.includes("alert")) {
          reply = "🚨 Critical alert active: Payment checkout failure logs currently at 340 issues in past 2h. Platform escalation is recommended immediately.";
        } else if (t.includes("report") || t.includes("sum")) {
          reply = "Enterprise Feedback Summary:\n- 50,000 complaints logged this year\n- 84% average resolution SLA met\n- 89% CSAT stable\n- Delivery complaint category is leading volume.";
        } else {
          reply = "I can compile instant company status reports, list SLA performance anomalies, summarize department stats, or check critical alerts. How can I help?";
        }
      }

      setMessages(prev => [
        ...prev,
        {
          id: `w-b-${Date.now()}`,
          sender: "bot",
          text: reply,
          timestamp: new Date()
        }
      ]);
    }, 350);
  };

  const chips = user.role === "authority"
    ? ["Analyze current major issues", "Department SLA report", "Any critical alerts?"]
    : ["What are my active tasks?", "How to resolve refund delays", "Summarize my week"];

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-brand-primary to-emerald-400 text-white flex items-center justify-center shadow-xl hover:scale-105 transition duration-200 z-50 cursor-pointer border border-teal-300/40"
        aria-label="Toggle Quick Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageSquare className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* CHAT POPUP DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-full max-w-[360px] h-[480px] bg-brand-card rounded-2xl border border-slate-200 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-brand-navbar text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center font-display font-bold text-xs">
                  AI
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs text-slate-100">ResolveAI Assistant</h3>
                  <span className="text-[9px] text-slate-400 font-medium">SOP & Quick Incident Desk</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Feed */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      msg.sender === "user" ? "bg-slate-700 text-white" : "bg-brand-primary text-white"
                    }`}
                  >
                    {msg.sender === "user" ? user.name.charAt(0) : "AI"}
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs leading-normal ${
                      msg.sender === "user"
                        ? "bg-brand-primary text-white rounded-tr-none"
                        : "bg-white border border-slate-200 text-brand-secondary rounded-tl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* horizontal suggestions */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="shrink-0 text-[10px] px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-500 font-medium transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-150 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask helper..."
                className="flex-1 text-xs bg-slate-100 border border-slate-200 rounded-xl p-2 focus:border-brand-primary focus:bg-white outline-none"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={() => handleSendMessage()}
                className="p-2 rounded-xl bg-brand-primary text-white hover:bg-teal-600 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
