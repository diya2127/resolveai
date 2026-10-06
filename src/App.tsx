import { useState, useEffect } from "react";
import { Sparkles, BarChart2, Folder, MessageSquare, Info, Mail, Menu, X, Share2 } from "lucide-react";
import { User, Task } from "./types";
import Auth from "./components/Auth";
import Sidebar from "./components/Sidebar";
import Overview from "./components/Overview";
import Dashboard from "./components/Dashboard";
import Categories from "./components/Categories";
import AboutContact from "./components/AboutContact";
import ChatbotHub from "./components/ChatbotHub";
import ChatWidget from "./components/ChatWidget";
import Integrations from "./components/Integrations";
import Logo from "./components/Logo";

const initialTasks: Task[] = [
  { id: "#4521", title: "Resolve refund complaint", desc: "Verify refund status and update customer — refund not received after 15 days.", priority: "High", status: "Pending", notes: "" },
  { id: "#4522", title: "Follow up on delivery delay", desc: "Customer reports package delayed 6 days beyond estimate. Confirm new ETA.", priority: "High", status: "In Progress", notes: "" },
  { id: "#4523", title: "Investigate duplicate charge", desc: "Customer charged twice for order #A1092. Confirm with payments team.", priority: "Medium", status: "Pending", notes: "" },
  { id: "#4524", title: "Update customer on damaged item", desc: "Product arrived damaged, replacement already shipped — confirm receipt.", priority: "Medium", status: "Pending", notes: "" },
  { id: "#4525", title: "Close resolved login ticket", desc: "Password reset issue confirmed fixed by customer, close out ticket.", priority: "Low", status: "Resolved", notes: "" },
  { id: "#4526", title: "Review support feedback batch", desc: "5 low-rating survey responses need a personal follow-up call.", priority: "Low", status: "Pending", notes: "" }
];

const defaultDemoUser: User = {
  name: "Keya",
  email: "keya@northwind.com",
  role: "employee",
  dept: "Finance / Refunds",
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("resolveai_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, role: "employee" };
      }
    } catch (e) {}
    return defaultDemoUser;
  });
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"overview" | "dashboard" | "integrations" | "categories" | "chatbot" | "about" | "contact">("dashboard");
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/tasks`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      }
    } catch (err) {
      console.warn("Could not fetch tasks from backend, using fallback:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);

    // Boot background Twilio auto-sync if credentials are saved
    try {
      const savedTwilio = localStorage.getItem("resolveai_twilio_config");
      if (savedTwilio) {
        const parsed = JSON.parse(savedTwilio);
        if (parsed.accountSid && parsed.authToken && parsed.autoSyncEnabled !== false) {
          fetch("/api/whatsapp/auto-sync/configure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountSid: parsed.accountSid,
              authToken: parsed.authToken,
              autoSyncEnabled: true,
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {}

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const handleLoginSuccess = (signedInUser: User) => {
    setUser(signedInUser);
    try {
      localStorage.setItem("resolveai_user", JSON.stringify(signedInUser));
    } catch (e) {}
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setProfileSidebarOpen(false);
    setMobileMenuOpen(false);
    localStorage.removeItem("resolveai_token");
    localStorage.removeItem("resolveai_user");
  };

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const userFirstLetter = user.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      {/* GLOBAL HEADER NAVBAR */}
      <header className="sticky top-0 z-30 bg-brand-navbar text-slate-800 border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div className="flex items-center cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <Logo size="sm" />
          </div>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: "overview", label: "Overview", icon: BarChart2 },
              { id: "dashboard", label: "My Queue", icon: Sparkles },
              { id: "integrations", label: "Connected Apps", icon: Share2 },
              { id: "categories", label: "Categories", icon: Folder },
              { id: "chatbot", label: "AI Chatbot", icon: MessageSquare },
              { id: "about", label: "About Us", icon: Info },
              { id: "contact", label: "Contact", icon: Mail }
            ].map(tab => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                    isActive
                      ? "bg-brand-primary/15 text-brand-primary border border-brand-primary/25 font-bold"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Profile Button / Trigger sidebar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setProfileSidebarOpen(true)}
              className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-brand-primary to-brand-warning flex items-center justify-center font-display font-bold text-white text-xs border border-slate-200 shadow-inner hover:scale-105 transition cursor-pointer"
              title="Open User Profile"
            >
              {userFirstLetter}
            </button>

            {/* Mobile menu trigger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 md:hidden transition cursor-pointer"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu collapsible panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 px-4 py-3 space-y-1.5 shadow-xl">
            {[
              { id: "overview", label: "Overview", icon: BarChart2 },
              { id: "dashboard", label: "My Queue", icon: Sparkles },
              { id: "integrations", label: "Connected Apps", icon: Share2 },
              { id: "categories", label: "Categories", icon: Folder },
              { id: "chatbot", label: "AI Chatbot", icon: MessageSquare },
              { id: "about", label: "About Us", icon: Info },
              { id: "contact", label: "Contact Us", icon: Mail }
            ].map(tab => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition text-left cursor-pointer ${
                    isActive
                      ? "bg-brand-primary/15 text-brand-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <IconComp className="w-4.5 h-4.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* CORE CONTENT LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && <Overview tasks={tasks} />}
        {activeTab === "dashboard" && <Dashboard user={user} tasks={tasks} setTasks={setTasks} />}
        {activeTab === "integrations" && <Integrations onRefreshTasks={fetchTasks} onNavigateToDashboard={() => setActiveTab("dashboard")} />}
        {activeTab === "categories" && <Categories />}
        {activeTab === "chatbot" && <ChatbotHub user={user} />}
        {activeTab === "about" && <AboutContact initialView="about" />}
        {activeTab === "contact" && <AboutContact initialView="contact" />}
      </main>

      {/* PERSISTENT MULTI-WIDGET COMPONENT DRAWERS */}
      <Sidebar
        isOpen={profileSidebarOpen}
        onClose={() => setProfileSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <ChatWidget user={user} tasks={tasks} />
    </div>
  );
}
