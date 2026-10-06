import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Share2,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Send,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Mail,
  ShoppingBag,
  Globe,
  Sliders,
  Sparkles,
  Database,
  Inbox,
  LogOut,
  Zap,
  CheckCircle,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { googleSignIn, logoutGoogle, initAuth } from "../services/googleAuth";
import {
  fetchRecentGmailMessages,
  ingestGmailEmailToResolveAI,
  GmailMessageItem,
} from "../services/gmailService";

interface IntegrationsProps {
  onRefreshTasks?: () => void;
  onNavigateToDashboard?: () => void;
}

export default function Integrations({ onRefreshTasks, onNavigateToDashboard }: IntegrationsProps) {
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "gmail" | "ecommerce">("whatsapp");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Real Google Auth & Gmail State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [realEmails, setRealEmails] = useState<GmailMessageItem[]>([]);
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [ingestedMap, setIngestedMap] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [gmailAutoSync, setGmailAutoSync] = useState<boolean>(true);

  // WhatsApp Simulator State
  const [waPhone, setWaPhone] = useState("+91 98201 12345");
  const [waName, setWaName] = useState("Aarav Malhotra");
  const [waMessage, setWaMessage] = useState("Package arrived completely broken with cracked plastic. Need an urgent replacement or full refund!");
  const [waLoading, setWaLoading] = useState(false);
  const [waResult, setWaResult] = useState<any>(null);

  // Twilio Direct Sync State
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioSyncLoading, setTwilioSyncLoading] = useState(false);
  const [twilioSyncResult, setTwilioSyncResult] = useState<any>(null);
  const [autoSyncActive, setAutoSyncActive] = useState(false);

  // Load saved Twilio config from localStorage and status from server
  useEffect(() => {
    try {
      const saved = localStorage.getItem("resolveai_twilio_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.accountSid) setTwilioSid(parsed.accountSid);
        if (parsed.authToken) setTwilioToken(parsed.authToken);
        if (parsed.autoSyncActive) setAutoSyncActive(parsed.autoSyncActive);
      }
    } catch (e) {}

    fetch("/api/whatsapp/auto-sync/status")
      .then(r => r.json())
      .then(d => {
        if (d.enabled) setAutoSyncActive(true);
      })
      .catch(() => {});
  }, []);

  // Gmail Simulator State
  const [gmailSender, setGmailSender] = useState("neha.kapoor@example.com");
  const [gmailSubject, setGmailSubject] = useState("Double charged on credit card for Order #ORD-10842");
  const [gmailBody, setGmailBody] = useState("I checked my ICICI bank statement today and noticed ₹4,299 was deducted twice for the same transaction. Please reverse the duplicate authorization immediately.");
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailResult, setGmailResult] = useState<any>(null);

  // E-Commerce Simulator State
  const [ecommProduct, setEcommProduct] = useState("Sony WH-1000XM5 Wireless Headphones");
  const [ecommRating, setEcommRating] = useState(1);
  const [ecommCustomer, setEcommCustomer] = useState("Rohan Deshmukh");
  const [ecommReview, setEcommReview] = useState("Left ear cup stopped working within 48 hours of delivery. Seller is not responding to warranty replacement request.");
  const [ecommLoading, setEcommLoading] = useState(false);
  const [ecommResult, setEcommResult] = useState<any>(null);

  // Live Stream from Supabase
  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchRecentSignals = async () => {
    setLoadingSignals(true);
    try {
      const res = await fetch("/api/complaints?limit=8");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.complaints)) {
          setRecentSignals(data.complaints);
        }
      }
    } catch (e) {
      console.warn("Could not load recent stream:", e);
    } finally {
      setLoadingSignals(false);
    }
  };

  useEffect(() => {
    fetchRecentSignals();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const getBaseUrl = () => {
    return window.location.origin;
  };

  // Google Sign-In Handler
  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    setGoogleAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        // Automatically fetch recent emails upon connection
        loadRealGmailEmails();
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setGoogleAuthError(err.message || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Google Sign-Out Handler
  const handleGoogleDisconnect = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setRealEmails([]);
    setSyncStatus(null);
  };

  // Fetch Real Gmail Messages
  const loadRealGmailEmails = async () => {
    setFetchingEmails(true);
    setSyncStatus(null);
    try {
      const messages = await fetchRecentGmailMessages(6);
      setRealEmails(messages);
      if (messages.length === 0) {
        setSyncStatus("No messages found in Inbox.");
      } else {
        setSyncStatus(`Successfully retrieved ${messages.length} recent emails from Gmail.`);
      }
    } catch (err: any) {
      console.error("Failed to load Gmail messages:", err);
      setSyncStatus(`Error reading Gmail: ${err.message}`);
    } finally {
      setFetchingEmails(false);
    }
  };

  // Ingest Single Real Email into ResolveAI
  const handleIngestSingleEmail = async (email: GmailMessageItem) => {
    setIngestingId(email.id);
    try {
      await ingestGmailEmailToResolveAI(email);
      setIngestedMap((prev) => ({ ...prev, [email.id]: true }));
      fetchRecentSignals();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      alert(`Could not ingest email: ${err.message}`);
    } finally {
      setIngestingId(null);
    }
  };

  // Ingest All Retrieved Emails
  const handleIngestAllEmails = async () => {
    if (realEmails.length === 0) return;
    setFetchingEmails(true);
    let count = 0;
    for (const email of realEmails) {
      if (!ingestedMap[email.id]) {
        try {
          await ingestGmailEmailToResolveAI(email);
          setIngestedMap((prev) => ({ ...prev, [email.id]: true }));
          count++;
        } catch (e) {
          console.warn("Failed to ingest email", email.id, e);
        }
      }
    }
    setFetchingEmails(false);
    setSyncStatus(`Ingested ${count} emails into ResolveAI Queue & Database!`);
    fetchRecentSignals();
    if (onRefreshTasks) onRefreshTasks();
  };

  // Continuous Gmail auto-polling every 20 seconds when Google account is connected
  useEffect(() => {
    if (!googleUser || !gmailAutoSync) return;

    const interval = setInterval(async () => {
      try {
        const messages = await fetchRecentGmailMessages(5);
        if (messages.length > 0) {
          setRealEmails(messages);
          let newIngested = 0;
          for (const msg of messages) {
            if (!ingestedMap[msg.id]) {
              try {
                await ingestGmailEmailToResolveAI(msg);
                setIngestedMap((prev) => ({ ...prev, [msg.id]: true }));
                newIngested++;
              } catch (e) {}
            }
          }
          if (newIngested > 0) {
            fetchRecentSignals();
            if (onRefreshTasks) onRefreshTasks();
          }
        }
      } catch (e) {
        // quiet background refresh
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [googleUser, gmailAutoSync, ingestedMap, onRefreshTasks]);

  // 1. Submit WhatsApp Simulation
  const handleSendWhatsApp = async (e: FormEvent) => {
    e.preventDefault();
    if (!waMessage.trim()) return;

    setWaLoading(true);
    setWaResult(null);

    try {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: waName,
          senderPhone: waPhone,
          subject: `WhatsApp Support: ${waMessage.substring(0, 40)}...`,
          message: waMessage,
        }),
      });

      const data = await res.json();
      setWaResult({
        success: res.ok,
        message: res.ok ? "WhatsApp message received, analyzed by AI, and ticket created!" : (data.error || "Failed"),
        details: data.result,
      });

      if (res.ok) {
        fetchRecentSignals();
        if (onRefreshTasks) onRefreshTasks();
      }
    } catch (err: any) {
      setWaResult({ success: false, message: err.message || "Network error" });
    } finally {
      setWaLoading(false);
    }
  };

  // Direct Twilio Inbound Cloud Sync
  const handleSyncTwilio = async (e: FormEvent) => {
    e.preventDefault();
    if (!twilioSid.trim() || !twilioToken.trim()) return;

    setTwilioSyncLoading(true);
    setTwilioSyncResult(null);

    try {
      // 1. Enable continuous background auto-sync loop on server
      const res = await fetch("/api/whatsapp/auto-sync/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid: twilioSid.trim(),
          authToken: twilioToken.trim(),
          autoSyncEnabled: true,
          intervalSeconds: 6,
        }),
      });

      const data = await res.json();
      setAutoSyncActive(true);

      // Persist in localStorage so it stays active across refreshes
      localStorage.setItem("resolveai_twilio_config", JSON.stringify({
        accountSid: twilioSid.trim(),
        authToken: twilioToken.trim(),
        autoSyncActive: true,
      }));

      setTwilioSyncResult({
        success: res.ok,
        message: data.message || "Live background auto-sync enabled! Twilio messages are continuously synced.",
        count: 1,
      });

      fetchRecentSignals();
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      setTwilioSyncResult({ success: false, message: err.message || "Network error" });
    } finally {
      setTwilioSyncLoading(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const newState = !autoSyncActive;
    setAutoSyncActive(newState);
    try {
      await fetch("/api/whatsapp/auto-sync/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid: twilioSid.trim(),
          authToken: twilioToken.trim(),
          autoSyncEnabled: newState,
        }),
      });
      localStorage.setItem("resolveai_twilio_config", JSON.stringify({
        accountSid: twilioSid.trim(),
        authToken: twilioToken.trim(),
        autoSyncActive: newState,
      }));
    } catch (e) {}
  };

  // 2. Submit Gmail Simulation
  const handleSendGmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!gmailBody.trim()) return;

    setGmailLoading(true);
    setGmailResult(null);

    try {
      const res = await fetch("/api/gmail/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: gmailSender,
          subject: gmailSubject,
          body: gmailBody,
        }),
      });

      const data = await res.json();
      setGmailResult({
        success: res.ok,
        message: res.ok ? "Support email parsed, categorized, and added to queue!" : (data.error || "Failed"),
        details: data.result,
      });

      if (res.ok) {
        fetchRecentSignals();
        if (onRefreshTasks) onRefreshTasks();
      }
    } catch (err: any) {
      setGmailResult({ success: false, message: err.message || "Network error" });
    } finally {
      setGmailLoading(false);
    }
  };

  // 3. Submit E-Commerce Simulation
  const handleSendECommerce = async (e: FormEvent) => {
    e.preventDefault();
    if (!ecommReview.trim()) return;

    setEcommLoading(true);
    setEcommResult(null);

    try {
      const res = await fetch("/api/complaints/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "E-Commerce",
          senderName: ecommCustomer,
          senderEmail: `${ecommCustomer.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          product: ecommProduct,
          rating: ecommRating,
          subject: `1-Star Customer Review for ${ecommProduct}`,
          message: ecommReview,
        }),
      });

      const data = await res.json();
      setEcommResult({
        success: res.ok,
        message: res.ok ? "E-Commerce negative review converted into actionable complaint!" : (data.error || "Failed"),
        details: data.data,
      });

      if (res.ok) {
        fetchRecentSignals();
        if (onRefreshTasks) onRefreshTasks();
      }
    } catch (err: any) {
      setEcommResult({ success: false, message: err.message || "Network error" });
    } finally {
      setEcommLoading(false);
    }
  };

  // 4. Batch Sync E-Commerce
  const handleSyncECommerceBatch = async () => {
    setEcommLoading(true);
    try {
      const res = await fetch("/api/ecommerce/sync", { method: "POST" });
      const data = await res.json();
      setEcommResult({
        success: res.ok,
        message: data.message || "Batch reviews synced successfully!",
      });
      fetchRecentSignals();
      if (onRefreshTasks) onRefreshTasks();
    } catch (e: any) {
      setEcommResult({ success: false, message: e.message || "Batch sync failed" });
    } finally {
      setEcommLoading(false);
    }
  };

  const getSourceIcon = (src?: string) => {
    const s = (src || "").toLowerCase();
    if (s.includes("whatsapp")) return <MessageCircle className="w-4 h-4 text-emerald-500" />;
    if (s.includes("gmail") || s.includes("email")) return <Mail className="w-4 h-4 text-red-500" />;
    if (s.includes("commerce")) return <ShoppingBag className="w-4 h-4 text-purple-500" />;
    return <Globe className="w-4 h-4 text-blue-500" />;
  };

  const getSourceBadgeClass = (src?: string) => {
    const s = (src || "").toLowerCase();
    if (s.includes("whatsapp")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("gmail") || s.includes("email")) return "bg-red-50 text-red-700 border-red-200";
    if (s.includes("commerce")) return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-brand-card p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-primary uppercase tracking-wider">
            <Share2 className="w-4 h-4" />
            External Apps &amp; Real Data Ingestion
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Connected Apps &amp; Ingestion Hub
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Connect your real Google / Gmail account, configure live WhatsApp webhooks, and sync E-Commerce stores to feed customer complaints directly into ResolveAI.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Supabase DB Connected</span>
          </div>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-primary/90 transition shadow-sm cursor-pointer"
            >
              <span>View Live Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* EXTERNAL APP CONNECTIONS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: REAL GMAIL / GOOGLE WORKSPACE */}
        <div className="bg-brand-card p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Mail className="w-5 h-5" />
            </div>
            {googleUser ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full">
                Not Connected
              </span>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Gmail / Google Workspace</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Read and ingest customer support emails directly from your real Google Inbox using OAuth 2.0.
            </p>
          </div>

          <div>
            {googleUser ? (
              <div className="space-y-3">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="truncate text-xs">
                    <div className="font-bold text-slate-800 truncate">{googleUser.displayName || "Google User"}</div>
                    <div className="text-[11px] text-slate-500 truncate">{googleUser.email}</div>
                  </div>
                  <button
                    onClick={handleGoogleDisconnect}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Disconnect Google"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setActiveChannel("gmail")}
                  className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Inbox className="w-4 h-4" />
                  <span>View &amp; Sync Emails</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleConnect}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs text-xs font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            )}
            {googleAuthError && (
              <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg">
                {googleAuthError}
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: WHATSAPP WEBHOOK */}
        <div className="bg-brand-card p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Webhook Active
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">WhatsApp Ingestion</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Listen to incoming customer WhatsApp chats via Meta Cloud API or Twilio Sandbox webhooks.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setActiveChannel("whatsapp")}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Configure &amp; Test WhatsApp</span>
            </button>
          </div>
        </div>

        {/* CARD 3: E-COMMERCE / SHOPIFY */}
        <div className="bg-brand-card p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold rounded-full">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Webhook Active
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">E-Commerce &amp; Reviews</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sync reviews, returns, and disputes from Shopify, Amazon, or external feedback forms.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setActiveChannel("ecommerce")}
              className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Manage E-Commerce Sync</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Grid: Left Side Detailed Channel View, Right Side Live Supabase Inflow Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-brand-card p-6 md:p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            
            {/* Channel Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              {[
                { id: "gmail", label: "Gmail Integration", icon: Mail, color: "text-red-600" },
                { id: "whatsapp", label: "WhatsApp Webhook", icon: MessageCircle, color: "text-emerald-600" },
                { id: "ecommerce", label: "E-Commerce Sync", icon: ShoppingBag, color: "text-purple-600" },
              ].map(tab => {
                const IconComp = tab.icon;
                const isActive = activeChannel === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChannel(tab.id as any)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <IconComp className={`w-4 h-4 ${tab.color}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: GMAIL INTEGRATION (REAL + SIMULATOR) */}
            {activeChannel === "gmail" && (
              <div className="space-y-6">
                
                {/* Real Google Account Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Mail className="w-4 h-4 text-red-600" />
                      <span>Live Gmail Inbox Reader</span>
                    </div>

                    {googleUser && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setGmailAutoSync(!gmailAutoSync)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                            gmailAutoSync
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                          title="Continuous background inbox poller"
                        >
                          <span className={`w-2 h-2 rounded-full ${gmailAutoSync ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{gmailAutoSync ? "Auto-Sync (20s) ON" : "Auto-Sync OFF"}</span>
                        </button>

                        <button
                          onClick={loadRealGmailEmails}
                          disabled={fetchingEmails}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${fetchingEmails ? "animate-spin" : ""}`} />
                          <span>Refresh Inbox</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {googleUser ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-500">Connected as: </span>
                          <span className="font-bold text-slate-800">{googleUser.email}</span>
                        </div>
                        {realEmails.length > 0 && (
                          <button
                            onClick={handleIngestAllEmails}
                            disabled={fetchingEmails}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Ingest All ({realEmails.length}) to Queue</span>
                          </button>
                        )}
                      </div>

                      {syncStatus && (
                        <div className="text-xs p-3 bg-red-50/70 border border-red-200 text-red-900 rounded-xl flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{syncStatus}</span>
                        </div>
                      )}

                      {/* Display retrieved emails list */}
                      {fetchingEmails && realEmails.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Fetching emails from your Gmail inbox...
                        </div>
                      ) : realEmails.length > 0 ? (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {realEmails.map((email) => {
                            const isIngested = ingestedMap[email.id];
                            const isIngesting = ingestingId === email.id;

                            return (
                              <div
                                key={email.id}
                                className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 transition"
                              >
                                <div className="space-y-0.5 overflow-hidden">
                                  <div className="font-bold text-slate-800 truncate">{email.subject}</div>
                                  <div className="text-[11px] text-slate-500 truncate">From: {email.from}</div>
                                  <div className="text-[11px] text-slate-400 line-clamp-1">{email.snippet}</div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  {isIngested ? (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                      <Check className="w-3.5 h-3.5" /> Ingested
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleIngestSingleEmail(email)}
                                      disabled={isIngesting}
                                      className="px-3 py-1.5 bg-brand-primary text-white text-[11px] font-bold rounded-lg hover:bg-brand-primary/90 transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      {isIngesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                      <span>Ingest</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Click "Refresh Inbox" to load incoming emails from your Google account.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Sign in with your Google account to let ResolveAI automatically read customer emails from your inbox with your permission.
                      </p>
                      <button
                        onClick={handleGoogleConnect}
                        disabled={googleLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                      >
                        <Mail className="w-4 h-4 text-red-600" />
                        <span>Connect Google Inbox Now</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Simulator Fallback */}
                <div className="border-t border-slate-200/60 pt-5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Or Test via Direct Webhook Payload
                  </h3>

                  <form onSubmit={handleSendGmail} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Email</label>
                        <input
                          type="email"
                          value={gmailSender}
                          onChange={e => setGmailSender(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={gmailSubject}
                          onChange={e => setGmailSubject(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Body</label>
                      <textarea
                        rows={2}
                        value={gmailBody}
                        onChange={e => setGmailBody(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">POST /api/gmail/webhook</span>
                      <button
                        type="submit"
                        disabled={gmailLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {gmailLoading ? "Processing..." : "Send Test Email"}
                      </button>
                    </div>

                    {gmailResult && (
                      <div className={`p-3 rounded-xl border text-xs ${gmailResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                        {gmailResult.message}
                      </div>
                    )}
                  </form>
                </div>

              </div>
            )}

            {/* TAB 2: WHATSAPP WEBHOOK */}
            {activeChannel === "whatsapp" && (
              <div className="space-y-6">
                
                {/* Real WhatsApp Connection & Webhook Info */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-emerald-800">
                    <MessageCircle className="w-4 h-4" />
                    <span>Real WhatsApp Connection &amp; Callback Webhook</span>
                  </div>
                  <p className="leading-relaxed">
                    Customer WhatsApp messages sent from mobile phones are ingested automatically into your Workspace Queue via Twilio Cloud Sync below.
                  </p>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                    <span className="font-semibold text-slate-700">Webhook URL:</span>
                    <span className="bg-white/80 px-2 py-0.5 rounded text-emerald-800 border border-emerald-200 truncate">
                      {getBaseUrl()}/api/whatsapp/webhook
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${getBaseUrl()}/api/whatsapp/webhook`, "wa_cb")}
                      className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-emerald-700 text-[10px] font-bold hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {copiedUrl === "wa_cb" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Direct Twilio Cloud Sync */}
                <div id="twilio-sync-box" className="p-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/60 border-2 border-emerald-400 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-sm font-bold text-emerald-950">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span>Twilio WhatsApp Cloud Sync Box</span>
                        <span className="block text-[11px] font-normal text-emerald-700">Pulls real messages you sent from your phone via Twilio REST API</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-200/80 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Bypasses Firewall
                    </span>
                  </div>

                  <form onSubmit={handleSyncTwilio} className="space-y-3 bg-white p-4 rounded-2xl border border-emerald-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Twilio Account SID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={twilioSid}
                          onChange={e => setTwilioSid(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Twilio Auth Token <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Your Twilio Auth Token (from Twilio Console)"
                          value={twilioToken}
                          onChange={e => setTwilioToken(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-mono"
                          required
                        />
                      </div>
                    </div>

                    {autoSyncActive && (
                      <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>
                            <strong>Continuous Live Auto-Sync: ACTIVE</strong> • Checking Twilio every 6 seconds
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleAutoSync}
                          className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          Pause Auto-Sync
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        📍 Found on: <strong>Twilio Console Homepage &gt; Account Info</strong>
                      </span>
                      <button
                        type="submit"
                        disabled={twilioSyncLoading}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {twilioSyncLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        <span>{autoSyncActive ? "Save & Keep Syncing Every 6s" : "⚡ Start Continuous Auto-Sync"}</span>
                      </button>
                    </div>

                    {twilioSyncResult && (
                      <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 mt-2 ${twilioSyncResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"}`}>
                        <span className="font-semibold">{twilioSyncResult.message}</span>
                        {twilioSyncResult.count > 0 && onNavigateToDashboard && (
                          <button
                            type="button"
                            onClick={onNavigateToDashboard}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 transition"
                          >
                            View in Queue →
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: E-COMMERCE SYNC */}
            {activeChannel === "ecommerce" && (
              <div className="space-y-6">
                <div className="p-5 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs text-purple-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-2 text-purple-900 text-sm">
                      <ShoppingBag className="w-4 h-4 text-purple-700" />
                      <span>Shopify &amp; E-Commerce Webhook Receiver</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active &amp; Ready
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    To receive real returns, cancellations, and customer complaints directly from Shopify, paste this URL into your Shopify store's <strong>Settings &gt; Notifications &gt; Webhooks</strong>.
                  </p>
                  <div className="flex items-center gap-2 p-2.5 bg-white border border-purple-200 rounded-xl font-mono text-xs text-purple-900">
                    <span className="font-bold text-slate-500 shrink-0">Webhook URL:</span>
                    <span className="truncate flex-1 font-semibold">{getBaseUrl()}/api/ecommerce/webhook</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${getBaseUrl()}/api/ecommerce/webhook`, "shop_cb")}
                      className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer"
                    >
                      {copiedUrl === "shop_cb" ? "✓ Copied" : "Copy URL"}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                    <span>Events supported: <strong>Order cancellation</strong>, <strong>Refund creation</strong></span>
                  </div>
                </div>

                {/* 1-Click Demo Products (Test without having a business) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Quick Test Products (No Storefront Required)</span>
                    <span className="text-[11px] font-normal text-slate-400">Click any product to auto-fill</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: "Sony WH-1000XM5", stars: 1, text: "Left ear cup died after 2 days. No response from seller on warranty.", user: "Rohan Deshmukh" },
                      { name: "Apple Watch Series 9", stars: 1, text: "Screen randomly flickers and battery dead in 2 hours.", user: "Simran Kaur" },
                      { name: "Nike Pegasus 40", stars: 2, text: "Sent size US 8 instead of US 10. Packaging arrived crushed.", user: "Aditya Verma" },
                      { name: "MacBook Pro Charger", stars: 1, text: "Power adapter brick was missing from sealed package upon arrival.", user: "Meera Patel" }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEcommProduct(item.name);
                          setEcommRating(item.stars);
                          setEcommReview(item.text);
                          setEcommCustomer(item.user);
                        }}
                        className="p-2.5 bg-white hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl text-left transition text-xs space-y-1 cursor-pointer group shadow-2xs"
                      >
                        <div className="font-semibold text-slate-800 truncate group-hover:text-purple-700">{item.name}</div>
                        <div className="text-[10px] text-amber-600 font-bold">⭐ {item.stars} Star Defect</div>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendECommerce} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Product Purchased</label>
                      <input
                        type="text"
                        value={ecommProduct}
                        onChange={e => setEcommProduct(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Star Rating</label>
                      <select
                        value={ecommRating}
                        onChange={e => setEcommRating(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value={1}>⭐ 1 Star (Defect)</option>
                        <option value={2}>⭐⭐ 2 Stars (Dissatisfied)</option>
                        <option value={3}>⭐⭐⭐ 3 Stars (Average)</option>
                        <option value={4}>⭐⭐⭐⭐ 4 Stars (Good)</option>
                        <option value={5}>⭐⭐⭐⭐⭐ 5 Stars (Positive)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={ecommCustomer}
                      onChange={e => setEcommCustomer(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Review Details</label>
                    <textarea
                      rows={3}
                      value={ecommReview}
                      onChange={e => setEcommReview(e.target.value)}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">POST /api/complaints/incoming</span>
                    <button
                      type="submit"
                      disabled={ecommLoading}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {ecommLoading ? "Ingesting..." : "Ingest Review"}
                    </button>
                  </div>

                  {ecommResult && (
                    <div className={`p-3 rounded-xl border text-xs ${ecommResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                      {ecommResult.message}
                    </div>
                  )}
                </form>
              </div>
            )}

          </div>

          {/* Webhook URLs Reference Card */}
          <div className="bg-brand-card p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Live Webhook Endpoints</h3>
            <p className="text-xs text-slate-500">
              Paste these webhook URLs into your external service configurations (Shopify, Meta, Zapier, Postmark):
            </p>

            <div className="space-y-3">
              {[
                { name: "Gmail / Email Webhook", url: `${getBaseUrl()}/api/gmail/webhook`, icon: Mail, key: "gm" },
                { name: "WhatsApp Cloud Webhook", url: `${getBaseUrl()}/api/whatsapp/webhook`, icon: MessageCircle, key: "wa" },
                { name: "E-Commerce / Store Webhook", url: `${getBaseUrl()}/api/complaints/incoming`, icon: ShoppingBag, key: "ec" },
              ].map(item => {
                const Icon = item.icon;
                const isCopied = copiedUrl === item.key;
                return (
                  <div key={item.key} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">{item.url}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(item.url, item.key)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Stream Inflow Activity Feed (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-brand-card p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
                  Live Ingestion Feed
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Records in Supabase PostgreSQL</p>
              </div>

              <button
                onClick={fetchRecentSignals}
                disabled={loadingSignals}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition cursor-pointer"
                title="Refresh Stream"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSignals ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingSignals && recentSignals.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading live signals...</div>
            ) : recentSignals.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No signals found in database.</div>
            ) : (
              <div className="space-y-3">
                {recentSignals.map((item, idx) => (
                  <div
                    key={item.complaint_id || idx}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${getSourceBadgeClass(item.source_name)}`}>
                        {getSourceIcon(item.source_name)}
                        <span>{item.source_name || "Website"}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.severity === "Critical" ? "bg-red-100 text-red-700" :
                        item.severity === "High" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-200 text-slate-700"
                      }`}>
                        {item.severity}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-800 line-clamp-1">{item.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{item.description}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/40">
                      <div className="font-medium text-slate-600">
                        {item.sender_name || "Customer"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Today"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
