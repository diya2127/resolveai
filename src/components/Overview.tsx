import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Clock,
  Smartphone,
  Mail,
  Globe,
  Activity,
  MessageSquare,
  Sparkles,
  Play,
  RefreshCw,
  ArrowRight,
  Info
} from "lucide-react";
import { Task, Insight, MonthlyVolume } from "../types";

// Dynamic monthly volumes segmented by department
const departmentMonthlyData: Record<string, MonthlyVolume[]> = {
  All: [
    { month: "Jan", volume: 62 },
    { month: "Feb", volume: 70 },
    { month: "Mar", volume: 58 },
    { month: "Apr", volume: 80 },
    { month: "May", volume: 74 },
    { month: "Jun", volume: 95 }
  ],
  Billing: [
    { month: "Jan", volume: 18 },
    { month: "Feb", volume: 24 },
    { month: "Mar", volume: 15 },
    { month: "Apr", volume: 32 },
    { month: "May", volume: 22 },
    { month: "Jun", volume: 35 }
  ],
  Shipping: [
    { month: "Jan", volume: 25 },
    { month: "Feb", volume: 28 },
    { month: "Mar", volume: 22 },
    { month: "Apr", volume: 26 },
    { month: "May", volume: 31 },
    { month: "Jun", volume: 38 }
  ],
  Technical: [
    { month: "Jan", volume: 19 },
    { month: "Feb", volume: 18 },
    { month: "Mar", volume: 21 },
    { month: "Apr", volume: 22 },
    { month: "May", volume: 21 },
    { month: "Jun", volume: 22 }
  ]
};

// High-fidelity details mapping for clicked monthly bars
interface MonthBreakdown {
  autoResolved: string;
  escalated: string;
  topIssue: string;
  slaCompliance: string;
  efficiencyGain: string;
}

const monthlyBreakdowns: Record<string, MonthBreakdown> = {
  Jan: { autoResolved: "81%", escalated: "19%", topIssue: "Post-holiday shipment & refund backlogs", slaCompliance: "96.4%", efficiencyGain: "+1.8%" },
  Feb: { autoResolved: "83%", escalated: "17%", topIssue: "Credit card payment gateway authorization timeouts", slaCompliance: "97.1%", efficiencyGain: "+2.4%" },
  Mar: { autoResolved: "85%", escalated: "15%", topIssue: "Account profile replication & syncing drops", slaCompliance: "98.2%", efficiencyGain: "+3.0%" },
  Apr: { autoResolved: "82%", escalated: "18%", topIssue: "Database replication connection micro-outages", slaCompliance: "95.5%", efficiencyGain: "-0.8%" },
  May: { autoResolved: "86%", escalated: "14%", topIssue: "Pre-summer flash promo code validation errors", slaCompliance: "98.8%", efficiencyGain: "+3.5%" },
  Jun: { autoResolved: "88%", escalated: "12%", topIssue: "Refund process batch queue thread deadlock", slaCompliance: "99.1%", efficiencyGain: "+4.2%" }
};

const insights: Insight[] = [
  {
    type: "amber",
    text: "Most repeated issue: Late delivery — 9,000 linked reports this quarter concentrated in northern hubs.",
    meta: "Pattern Detection"
  },
  {
    type: "crit",
    text: "Critical issue detected: Payment gateway failure affecting checkout in 3 regional zones.",
    meta: "Severity: Critical"
  },
  {
    type: "info",
    text: "Suggested action: Increase support team staffing during 6–9pm peak hours to cut average response times by an estimated 22%.",
    meta: "AI Recommendation"
  }
];

interface OverviewProps {
  tasks?: Task[];
}

export default function Overview({ tasks = [] }: OverviewProps) {
  // 1. Department Filter for Monthly Volume
  const [activeDeptFilter, setActiveDeptFilter] = useState<string>("All");
  const [selectedMonthName, setSelectedMonthName] = useState<string | null>("Jun");

  // Get current monthly list based on filter
  const currentMonthlyData = useMemo(() => {
    return departmentMonthlyData[activeDeptFilter] || departmentMonthlyData.All;
  }, [activeDeptFilter]);

  const maxVolume = useMemo(() => {
    return Math.max(...currentMonthlyData.map(d => d.volume), 1);
  }, [currentMonthlyData]);

  // Selected Month details
  const activeBreakdown = useMemo(() => {
    if (!selectedMonthName) return null;
    return monthlyBreakdowns[selectedMonthName] || null;
  }, [selectedMonthName]);

  // 2. SLA Resolution Performance Interactive Metric Toggle
  const [slaMetric, setSlaMetric] = useState<"duration" | "fcr">("duration");
  const [hoveredNodeIdx, setHoveredNodeIdx] = useState<number | null>(null);

  // SLA Performance Data Definition
  // Coordinate calculations mapped to a SVG viewBox of 500 x 120
  const slaPoints = useMemo(() => {
    const rawData = slaMetric === "duration"
      ? [
          { day: "Mon", val: 4.8, display: "4.8h" },
          { day: "Tue", val: 4.2, display: "4.2h" },
          { day: "Wed", val: 3.5, display: "3.5h" },
          { day: "Thu", val: 3.7, display: "3.7h" },
          { day: "Fri", val: 3.6, display: "3.6h" },
          { day: "Sat", val: 2.3, display: "2.3h" },
          { day: "Sun", val: 1.9, display: "1.9h" }
        ]
      : [
          { day: "Mon", val: 78, display: "78%" },
          { day: "Tue", val: 81, display: "81%" },
          { day: "Wed", val: 85, display: "85%" },
          { day: "Thu", val: 83, display: "83%" },
          { day: "Fri", val: 87, display: "87%" },
          { day: "Sat", val: 91, display: "91%" },
          { day: "Sun", val: 94, display: "94%" }
        ];

    // Scale function: maps y values into 20px (top peak performance) to 100px (bottom poor performance)
    const minVal = slaMetric === "duration" ? 5.5 : 70;
    const maxVal = slaMetric === "duration" ? 1.5 : 100;

    return rawData.map((d, idx) => {
      // X coordinates equally distributed from 15 to 485
      const x = 20 + idx * 76.6; 
      // Y coordinates scaled
      const percentage = (d.val - minVal) / (maxVal - minVal);
      // for duration, lower is better (so high val maps to bottom Y=100, low val maps to top Y=20)
      // for FCR, higher is better (so high val maps to top Y=20, low val maps to bottom Y=100)
      const y = 100 - (percentage * 80);
      return {
        ...d,
        x,
        y: Math.max(15, Math.min(105, y))
      };
    });
  }, [slaMetric]);

  // Construct dynamic SVG paths
  const linePathD = useMemo(() => {
    return slaPoints.map((pt, idx) => (idx === 0 ? "M" : "L") + ` ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");
  }, [slaPoints]);

  const areaPathD = useMemo(() => {
    if (slaPoints.length === 0) return "";
    const firstX = slaPoints[0].x.toFixed(1);
    const lastX = slaPoints[slaPoints.length - 1].x.toFixed(1);
    return `${linePathD} L ${lastX} 118 L ${firstX} 118 Z`;
  }, [slaPoints, linePathD]);

  // 3. Incoming Channels Interactive Logs Simulation
  const [channels, setChannels] = useState([
    { id: "chatbot", source: "Autonomous Chatbot", count: 45000, icon: MessageSquare, color: "from-[#4F46E5] to-[#06B6D4]" },
    { id: "email", source: "E-Mail Sync Connector", count: 25000, icon: Mail, color: "from-[#06B6D4] to-[#14B8A6]" },
    { id: "web", source: "Embedded Web Portals", count: 18000, icon: Globe, color: "from-[#14B8A6] to-[#38BDF8]" },
    { id: "sdk", source: "Mobile App Direct SDK", count: 12000, icon: Smartphone, color: "from-[#312E81] via-[#4F46E5] to-[#14B8A6]" }
  ]);

  // Dynamic values based on simulation
  const totalInflowLogs = useMemo(() => {
    return channels.reduce((sum, c) => sum + c.count, 0);
  }, [channels]);

  const simulateLogBurst = (channelId: string) => {
    setChannels(prev =>
      prev.map(c => (c.id === channelId ? { ...c, count: c.count + 2500 } : c))
    );
  };

  const resetSimulation = () => {
    setChannels([
      { id: "chatbot", source: "Autonomous Chatbot", count: 45000, icon: MessageSquare, color: "from-[#4F46E5] to-[#06B6D4]" },
      { id: "email", source: "E-Mail Sync Connector", count: 25000, icon: Mail, color: "from-[#06B6D4] to-[#14B8A6]" },
      { id: "web", source: "Embedded Web Portals", count: 18000, icon: Globe, color: "from-[#14B8A6] to-[#38BDF8]" },
      { id: "sdk", source: "Mobile App Direct SDK", count: 12000, icon: Smartphone, color: "from-[#312E81] via-[#4F46E5] to-[#14B8A6]" }
    ]);
  };

  // 4. Live Queue stats calculations merged with database baselines
  const [dbTotals, setDbTotals] = useState({ total: 100000, resolved: 85000, pending: 15000, csat: "92%" });

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(res => res.json())
      .then(data => {
        if (data.totalComplaints > 0) {
          setDbTotals({
            total: data.totalComplaints,
            resolved: data.resolvedComplaints,
            pending: data.pendingComplaints + data.inProgressComplaints,
            csat: data.csatRating || "92%",
          });
        }
      })
      .catch(err => console.warn("Could not fetch dashboard stats in Overview:", err));
  }, []);

  const liveTotalQueueCount = tasks.length;
  const liveResolvedCount = tasks.filter(t => t.status === "Resolved").length;
  const livePendingCount = tasks.filter(t => t.status === "Pending").length;
  const liveInProgressCount = tasks.filter(t => t.status === "In Progress").length;

  const totalComplaintsValue = dbTotals.total > 1000 ? dbTotals.total + liveTotalQueueCount : dbTotals.total;
  const resolvedTasksValue = dbTotals.total > 1000 ? dbTotals.resolved + liveResolvedCount : dbTotals.resolved;
  const pendingIssuesValue = dbTotals.total > 1000 ? dbTotals.pending + (livePendingCount + liveInProgressCount) : dbTotals.pending;

  // Compute CSAT dynamically: if high ratio of resolved tasks, CSAT is higher
  const calculatedCsat = useMemo(() => {
    if (dbTotals.csat && dbTotals.total <= 1000) return dbTotals.csat;
    if (tasks.length === 0) return dbTotals.csat || "92%";
    const solvedRatio = liveResolvedCount / tasks.length;
    const baseVal = 91 + Math.round(solvedRatio * 4);
    return `${Math.min(98, Math.max(90, baseVal))}%`;
  }, [tasks, liveResolvedCount, dbTotals]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-primary/10 pb-5">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-secondary md:text-3xl">Platform Overview</h1>
          <p className="text-sm text-slate-400 mt-1">ResolveAI-wide feedback intelligence across all channels and departments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-slate-300 bg-brand-navbar/70 border border-brand-primary/15 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Live Tracker Active
          </div>
        </div>
      </div>

      {/* KPI Stats Grid - Synced dynamically with the actual queue! */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Complaints",
            value: totalComplaintsValue.toLocaleString(),
            delta: `Includes ${liveTotalQueueCount} active queue items`,
            icon: TrendingUp,
            iconColor: "text-brand-primary bg-brand-primary-soft/40 border border-brand-primary/10"
          },
          {
            label: "Resolved Tasks",
            value: resolvedTasksValue.toLocaleString(),
            delta: `${liveResolvedCount} resolved in current queue`,
            icon: CheckCircle,
            iconColor: "text-brand-success bg-emerald-500/10 border border-emerald-500/20"
          },
          {
            label: "Pending Issues",
            value: pendingIssuesValue.toLocaleString(),
            delta: `${livePendingCount + liveInProgressCount} awaiting SLA action`,
            icon: Clock,
            iconColor: "text-brand-warning bg-brand-warning/10 border border-brand-warning/20"
          },
          {
            label: "Customer CSAT",
            value: calculatedCsat,
            delta: `▲ Real-time based on resolution rates`,
            icon: Lightbulb,
            iconColor: "text-purple-400 bg-purple-500/10 border border-purple-500/20"
          }
        ].map((stat, i) => (
          <div key={i} className="bg-brand-card p-5 rounded-2xl border border-brand-primary/10 shadow-lg flex items-start justify-between relative overflow-hidden group hover:border-brand-primary/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full filter blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative z-10">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
              <h2 className="font-display font-bold text-3xl text-brand-secondary mt-2.5 tracking-tight">{stat.value}</h2>
              <span className="text-xs text-slate-400 font-medium block mt-1">{stat.delta}</span>
            </div>
            <div className={`p-2.5 rounded-xl relative z-10 ${stat.iconColor}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts: Interactive Bar Chart & SLA Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Bar Chart with Department Filters & Click details */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-primary/10 shadow-xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display font-semibold text-base text-brand-secondary">Monthly Complaint Volume</h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter channel volumes and click bars to audit details</p>
              </div>
              
              {/* Department selector */}
              <div className="flex items-center gap-1.5 bg-brand-bg border border-brand-primary/15 p-1 rounded-xl self-start">
                {["All", "Billing", "Shipping", "Technical"].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      setActiveDeptFilter(dept);
                      setSelectedMonthName("Jun"); // default or keep Jun
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeDeptFilter === dept
                        ? "bg-brand-primary text-slate-900 font-semibold shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Graph Bars - Fully Interactive height! */}
            <div className="h-44 flex items-end justify-between gap-3.5 pt-4 border-b border-brand-primary/10 pb-2">
              {currentMonthlyData.map((d, i) => {
                const heightPercent = Math.max(10, (d.volume / maxVolume) * 100);
                const isSelected = selectedMonthName === d.month;
                
                // Color choices reflecting purple-pink-blue gradient palettes
                const barGradients = [
                  "from-[#312E81] to-[#4F46E5]",
                  "from-[#4F46E5] to-[#06B6D4]",
                  "from-[#06B6D4] to-[#14B8A6]",
                  "from-[#1E1B4B] via-[#4F46E5] to-[#06B6D4]",
                  "from-[#4F46E5] via-[#06B6D4] to-[#38BDF8]",
                  "from-[#06B6D4] to-[#312E81]"
                ];
                const gradientClass = barGradients[i % barGradients.length];

                return (
                  <div 
                    key={i} 
                    className="flex-1 flex flex-col items-center group h-full justify-end cursor-pointer"
                    onClick={() => setSelectedMonthName(d.month)}
                  >
                    <div className="w-full relative flex flex-col items-center h-full justify-end">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 bg-brand-primary text-slate-900 font-bold text-[10px] px-1.5 py-0.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 font-mono">
                        {d.volume}k logs
                      </div>

                      {/* Bar - Custom Animated Height using state-driven percent style, fully fixing the static style override */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                        className={`w-full bg-gradient-to-t ${gradientClass} rounded-t-xl group-hover:opacity-85 transition-all shadow-md relative overflow-hidden ${
                          isSelected ? "ring-2 ring-brand-primary shadow-brand-primary/20 scale-105" : "opacity-75"
                        }`}
                      >
                        {/* Selected overlay glow */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-white/10 animate-pulse" />
                        )}
                      </motion.div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold mt-2 transition-colors ${
                      isSelected ? "text-brand-primary" : "text-slate-400 group-hover:text-slate-200"
                    }`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month Detail Breakdown Drawer (Smooth entry) */}
          <div className="mt-4 pt-3 relative">
            <AnimatePresence mode="wait">
              {activeBreakdown ? (
                <motion.div
                  key={selectedMonthName}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="bg-brand-bg/70 border border-brand-primary/10 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <div className="md:col-span-1 border-r border-brand-primary/10 pr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Breakdown Target</span>
                    <h4 className="text-xl font-display font-bold text-brand-primary mt-1">{selectedMonthName} Audit</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">SLA Efficiency {activeBreakdown.efficiencyGain}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:col-span-2">
                    <div className="bg-brand-card/50 p-2.5 rounded-lg border border-brand-primary/5">
                      <span className="text-[9px] text-slate-400 block font-semibold">AI AUTOMATED RESOLUTION</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">{activeBreakdown.autoResolved}</span>
                    </div>
                    <div className="bg-brand-card/50 p-2.5 rounded-lg border border-brand-primary/5">
                      <span className="text-[9px] text-slate-400 block font-semibold">ESCALATED TO TEAMS</span>
                      <span className="text-sm font-mono font-bold text-brand-warning">{activeBreakdown.escalated}</span>
                    </div>
                  </div>
                  <div className="bg-brand-card/50 p-2.5 rounded-lg border border-brand-primary/5 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">TOP REGIONAL COMPLAINT VECTORS</span>
                      <p className="text-[10px] text-brand-secondary font-medium leading-tight mt-1 line-clamp-2">
                        {activeBreakdown.topIssue}
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-brand-primary mt-1 flex items-center gap-1">
                      <span>SLA: {activeBreakdown.slaCompliance}</span>
                      <span className="text-slate-400">• Passed</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs font-medium border border-dashed border-brand-primary/10 rounded-xl">
                  Click on any monthly data bar above to view the performance and SLA audit breakdown report.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Live SLA and Department Metrics Rate Indicators */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-primary/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display font-semibold text-base text-brand-secondary">Department Status</h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">OK</span>
            </div>
            <p className="text-xs text-slate-400 mb-5">SLA benchmarks tracked across live systems</p>
            
            <div className="space-y-4">
              {[
                { name: "Global Resolution Rate", pct: Math.min(98, 85 + (liveResolvedCount * 2)), color: "bg-brand-primary shadow-brand-primary/30" },
                { name: "Active Ticket Backlog", pct: Math.min(100, Math.max(5, 12 - (liveResolvedCount * 1.5) + (livePendingCount * 2.5))), color: "bg-brand-warning shadow-brand-warning/30" },
                { name: "First-Contact Resolution Ratio", pct: 94, color: "bg-emerald-500 shadow-emerald-500/30" }
              ].map((item, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5 group-hover:text-slate-200 transition-colors">
                    <span>{item.name}</span>
                    <span className="font-mono text-brand-secondary">{item.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-brand-bg rounded-full overflow-hidden border border-brand-primary/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeInOut" }}
                      className={`h-full ${item.color} rounded-full transition-all`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-brand-primary/10 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Info className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
            <div>
              Platform compliance calculations sync directly against the dynamic agent dispatch SLA contracts.
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Line Chart & Channels Simulator (The "Realized" Segment) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dynamic SVG SLA Resolution Performance Graph */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-primary/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-base text-brand-secondary">
                  {slaMetric === "duration" ? "Avg Resolution Duration" : "SLA First-Contact Resolution"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">SLA real-time tracking (Last 7 Days)</p>
              </div>
              
              {/* Metric toggler */}
              <div className="flex bg-brand-bg border border-brand-primary/15 rounded-xl p-1">
                <button
                  onClick={() => setSlaMetric("duration")}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    slaMetric === "duration"
                      ? "bg-brand-primary text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Hours
                </button>
                <button
                  onClick={() => setSlaMetric("fcr")}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    slaMetric === "fcr"
                      ? "bg-brand-primary text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  FCR Ratio %
                </button>
              </div>
            </div>

            {/* Dynamic Morphing SVG Canvas */}
            <div className="relative pt-4 h-40 w-full bg-brand-bg/30 rounded-xl border border-brand-primary/5 p-2 overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity="0.25" />
                    <stop offset="50%" stopColor="var(--color-brand-primary)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--color-brand-bg)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="50%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                
                {/* Horizontal Grid lines */}
                <line x1="15" y1="20" x2="485" y2="20" stroke="rgba(99, 102, 241, 0.08)" strokeDasharray="3 3" />
                <line x1="15" y1="60" x2="485" y2="60" stroke="rgba(99, 102, 241, 0.08)" strokeDasharray="3 3" />
                <line x1="15" y1="100" x2="485" y2="100" stroke="rgba(99, 102, 241, 0.08)" strokeDasharray="3 3" />

                {/* Closed Area (Morphed smoothly using react states) */}
                <path
                  d={areaPathD}
                  fill="url(#areaGrad)"
                  className="transition-all duration-500 ease-out"
                />

                {/* Line Path (Morphed smoothly) */}
                <path
                  d={linePathD}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />

                {/* Dynamic Interactive Node Points */}
                {slaPoints.map((pt, idx) => {
                  const isHovered = hoveredNodeIdx === idx;
                  return (
                    <g 
                      key={idx} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNodeIdx(idx)}
                      onMouseLeave={() => setHoveredNodeIdx(null)}
                    >
                      {/* Interactive ring hover effect */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 9 : 0}
                        className="fill-brand-primary/20 stroke-none transition-all duration-200"
                      />
                      {/* Node point */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3.5}
                        className={`fill-white stroke-brand-primary transition-all duration-200`}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                      />
                      {/* Interactive Tooltip Node */}
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        className={`text-[9px] font-mono fill-brand-primary font-bold transition-opacity duration-200 ${
                          isHovered ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {pt.display}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* SLA Days indicators */}
          <div className="flex justify-between px-2 text-[10px] font-mono font-bold text-slate-400 mt-2.5 pt-2.5 border-t border-brand-primary/10">
            {slaPoints.map((pt, idx) => (
              <span 
                key={idx} 
                className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${
                  hoveredNodeIdx === idx ? "text-brand-primary bg-brand-primary-soft/40" : ""
                }`}
                onMouseEnter={() => setHoveredNodeIdx(idx)}
                onMouseLeave={() => setHoveredNodeIdx(null)}
              >
                {pt.day} ({pt.display})
              </span>
            ))}
          </div>
        </div>

        {/* Channels Inflow logs with REACTIVE Simulation burster */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-primary/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display font-semibold text-base text-brand-secondary">Incoming Channels Inflow</h3>
                <p className="text-xs text-slate-400">Reactive feedback pipeline distribution simulator</p>
              </div>
              <button 
                onClick={resetSimulation}
                className="p-1.5 rounded-lg border border-brand-primary/15 hover:bg-brand-primary-soft text-slate-300 hover:text-brand-primary transition cursor-pointer"
                title="Reset Simulation counts"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive bars list with instant "+ Sim" triggers */}
            <div className="space-y-3 my-4">
              {channels.map((chan, idx) => {
                const pct = Math.round((chan.count / totalInflowLogs) * 100);
                return (
                  <div key={chan.id} className="group/channel bg-brand-bg/30 p-2 rounded-xl border border-brand-primary/5 hover:border-brand-primary/10 transition-all">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <chan.icon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{chan.source}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[10px]">{chan.count.toLocaleString()} logs</span>
                        <span className="text-brand-secondary font-bold">{pct}%</span>
                        
                        {/* Simulation injection button */}
                        <button
                          onClick={() => simulateLogBurst(chan.id)}
                          className="ml-1 px-1.5 py-0.5 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-slate-900 rounded text-[9px] font-mono transition font-bold uppercase flex items-center gap-0.5 cursor-pointer"
                          title="Inject simulated bulk volume burst"
                        >
                          <Play className="w-2 h-2 fill-current" />
                          +2.5k
                        </button>
                      </div>
                    </div>
                    {/* Realized reactive progress bar */}
                    <div className="h-2 w-full bg-brand-bg rounded-full overflow-hidden border border-brand-primary/10 relative">
                      <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ type: "spring", stiffness: 80, damping: 15 }}
                        className={`h-full bg-gradient-to-r ${chan.color} rounded-full`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-brand-primary-soft/30 border border-brand-primary/10 rounded-xl">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <Activity className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
              <span>Simulated Inflow Volume: {totalInflowLogs.toLocaleString()} cumulative logs</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Router: Cluster C-19</span>
          </div>
        </div>

      </div>

      {/* AI Insights Alerts */}
      <div className="bg-gradient-to-br from-indigo-50/40 via-sky-50/20 to-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-primary-soft text-brand-primary rounded-lg">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-slate-900 tracking-tight">
                AI Generated Insights
              </h4>
              <p className="text-xs text-slate-500">Real-time predictive anomalies & pattern detection</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE ANALYSIS
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {insights.map((insight, idx) => {
            let styleClass = "border-l-4 border-brand-primary bg-indigo-50/50 text-slate-800 border border-slate-100 shadow-sm shadow-indigo-100/10";
            let labelColor = "text-brand-primary";
            let iconColor = "text-brand-primary";

            if (insight.type === "crit") {
              styleClass = "border-l-4 border-red-500 bg-red-50/60 text-slate-800 border border-slate-100 shadow-sm shadow-red-100/10";
              labelColor = "text-red-700";
              iconColor = "text-red-500";
            } else if (insight.type === "amber") {
              styleClass = "border-l-4 border-amber-500 bg-amber-50/60 text-slate-800 border border-slate-100 shadow-sm shadow-amber-100/10";
              labelColor = "text-amber-700";
              iconColor = "text-amber-500";
            }

            return (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 rounded-r-xl flex items-start gap-3.5 transition-all hover:translate-x-1 duration-200 ${styleClass}`}
              >
                <div className="p-1 rounded-lg bg-white shadow-xs border border-slate-100">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">{insight.text}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-slate-150 ${labelColor}`}>
                      {insight.meta}
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] text-slate-400 font-medium">Generated 10m ago</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
