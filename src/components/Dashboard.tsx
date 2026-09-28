import { useState, Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import { CheckCircle, AlertOctagon, User, Clock, ChevronDown, Check, Save, Sparkles, TrendingDown, Activity, BarChart3, Award, TrendingUp, Inbox } from "lucide-react";
import { User as UserType, Task, DepartmentPerformance, TaskPriority, TaskStatus } from "../types";

interface DashboardProps {
  user: UserType;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
}

const deptsData: DepartmentPerformance[] = [
  { name: "Logistics & Delivery", pct: 78 },
  { name: "Finance / Refunds", pct: 65 },
  { name: "Customer Support", pct: 88 },
  { name: "Technical / Platform", pct: 71 },
  { name: "Accounts & Billing", pct: 82 }
];

export default function Dashboard({ user, tasks, setTasks }: DashboardProps) {
  const isAuthority = user.role === "authority";

  // State to manage task note updates
  const [activeNotes, setActiveNotes] = useState<{ [key: string]: string }>({});

  const handleAcceptTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "In Progress" } : t));
  };

  const handleResolveTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "Resolved" } : t));
  };

  const handleToggleNotes = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notesOpen: !t.notesOpen } : t));
  };

  const handleSaveNotes = (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes: text, notesOpen: false } : t));
  };

  // Helper colors
  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "High":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-red-50 text-red-600 border border-red-100">High</span>;
      case "Medium":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-amber-50 text-brand-warning border border-amber-100">Medium</span>;
      case "Low":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-slate-50 text-slate-500 border border-slate-100">Low</span>;
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case "Resolved":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-emerald-50 text-brand-success border border-emerald-100">Resolved</span>;
      case "In Progress":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-brand-primary-soft text-brand-primary border border-brand-primary/25">In Progress</span>;
      case "Pending":
        return <span className="px-2.5 py-1 text-[11px] font-bold font-mono uppercase tracking-wider rounded-lg bg-slate-100 text-slate-500 border border-slate-200">Pending</span>;
    }
  };

  if (!isAuthority) {
    // EMPLOYEE VIEWS
    const pendingTasks = tasks.filter(t => t.status !== "Resolved");
    const completedCount = tasks.filter(t => t.status === "Resolved").length;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        {/* Welcome Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="font-display font-bold text-2xl text-brand-secondary md:text-3xl">Good to see you, {user.name.split(" ")[0]}</h1>
            <p className="text-sm text-slate-500 mt-1">{user.dept} • AI-assigned active feedback queue</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-brand-success rounded-xl">
            <span className="w-2 h-2 rounded-full bg-brand-success" />
            Duty Active
          </div>
        </div>

        {/* Employee Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Tasks", value: pendingTasks.length, delta: `${tasks.filter(t => t.priority === "High" && t.status !== "Resolved").length} high priority`, icon: Clock, iconColor: "text-amber-600 bg-amber-50" },
            { label: "Resolved this week", value: 21 + completedCount, delta: "▲ ahead of quota", icon: CheckCircle, iconColor: "text-brand-success bg-emerald-50" },
            { label: "Avg response", value: "3.2h", delta: "▼ 0.6h faster", icon: TrendingDown, iconColor: "text-brand-primary bg-brand-primary-soft" },
            { label: "CSAT rating", value: "4.6★", delta: "from closed tickets", icon: User, iconColor: "text-brand-secondary bg-slate-100" }
          ].map((stat, i) => (
            <div key={i} className="bg-brand-card p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
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

        {/* Workspace Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue Task List */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display font-semibold text-base text-brand-secondary">My Workspace Queue</h3>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-brand-primary-soft text-brand-primary border border-brand-primary/20 rounded-full">
                {pendingTasks.length} Assigned
              </span>
            </div>

            <div className="grid gap-4">
              {tasks.map(task => (
                <div key={task.id} className="bg-brand-card rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 hover:border-brand-primary/30 transition-all duration-250">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-400">{task.id}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <h4 className="font-display font-bold text-base text-brand-secondary">{task.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{task.desc}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>

                  {/* Task History / Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      {task.status === "Pending" && (
                        <button
                          onClick={() => handleAcceptTask(task.id)}
                          className="px-4 py-2 bg-brand-primary hover:opacity-90 text-white font-semibold text-xs rounded-xl shadow-sm shadow-brand-primary/10 transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept Task
                        </button>
                      )}
                      {task.status === "In Progress" && (
                        <button
                          onClick={() => handleResolveTask(task.id)}
                          className="px-4 py-2 bg-brand-success hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-50 transition flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleNotes(task.id)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-100 transition flex items-center gap-1.5"
                      >
                        {task.notesOpen ? "Close Notes" : "Add/Edit Note"}
                        <ChevronDown className={`w-3 h-3 transition-transform ${task.notesOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {task.notes && (
                      <span className="text-xs font-mono text-slate-400 max-w-xs truncate">
                        Latest: "{task.notes}"
                      </span>
                    )}
                  </div>

                  {/* Progress notes expanded textarea */}
                  {task.notesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pt-3 border-t border-dashed border-slate-100 space-y-3"
                    >
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Progress Update Note</label>
                      <textarea
                        placeholder="Type diagnostic results, customer response, or system resolution logs here..."
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none min-height-[80px]"
                        value={activeNotes[task.id] !== undefined ? activeNotes[task.id] : (task.notes || "")}
                        onChange={e => setActiveNotes({ ...activeNotes, [task.id]: e.target.value })}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveNotes(task.id, activeNotes[task.id] !== undefined ? activeNotes[task.id] : (task.notes || ""))}
                          className="px-4 py-1.5 bg-brand-secondary hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
                        >
                          <Save className="w-3 h-3" /> Save Note
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agent Specific Performance & Metric Graphs */}
          <div className="space-y-6">
            {/* Graph 1: Resolution Velocity Trend */}
            <div className="bg-brand-card p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-semibold text-sm text-brand-secondary">My Resolution Velocity</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tasks processed hour-by-hour</p>
                </div>
                <BarChart3 className="w-4 h-4 text-brand-primary" />
              </div>
              <div className="h-28 flex items-end justify-between gap-2 pt-2">
                {[
                  { hour: "9a", val: 3, color: "bg-[#4F46E5]" },
                  { hour: "11a", val: 5, color: "bg-[#06B6D4]" },
                  { hour: "1p", val: 8, color: "bg-[#14B8A6]" },
                  { hour: "3p", val: 6, color: "bg-[#312E81]" },
                  { hour: "5p", val: 9, color: "bg-[#38BDF8]" },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-mono text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.val}
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.val / 9) * 100}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`w-full rounded-t-md ${item.color} group-hover:opacity-85 transition-opacity cursor-pointer`}
                      style={{ height: "40px" }}
                    />
                    <span className="text-[10px] font-mono font-semibold text-slate-400">{item.hour}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graph 2: CSAT Customer Feedback Proportions */}
            <div className="bg-brand-card p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-semibold text-sm text-brand-secondary">Workstation Feedback (CSAT)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Distribution of 5★ ratings today</p>
                </div>
                <Award className="w-4 h-4 text-brand-success animate-pulse" />
              </div>

              <div className="space-y-2.5">
                {[
                  { stars: "5 Stars", pct: 70, color: "from-[#312E81] to-[#4F46E5]" },
                  { stars: "4 Stars", pct: 20, color: "from-[#4F46E5] to-[#06B6D4]" },
                  { stars: "3 Stars", pct: 8, color: "from-[#06B6D4] to-[#14B8A6]" },
                  { stars: "1-2 Stars", pct: 2, color: "from-[#1E1B4B] via-[#4F46E5] to-[#14B8A6]" },
                ].map((feedback, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>{feedback.stars}</span>
                      <span className="font-mono text-brand-secondary">{feedback.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${feedback.pct}%` }}
                        transition={{ duration: 0.9, delay: idx * 0.1 }}
                        className={`h-full bg-gradient-to-r ${feedback.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ADMINISTRATOR DASHBOARD
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-secondary md:text-3xl">Corporate Health Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time status trackers, department performance monitors, and predictive indicators</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-secondary text-white text-xs font-semibold rounded-xl font-mono uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
          Administrator Access
        </div>
      </div>

      {/* KPI Stats Authority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Feedback", value: "50,000", delta: "Cumulative this year", icon: TrendingDown, iconColor: "text-slate-600 bg-slate-100" },
          { label: "Resolved Tickets", value: "42,000", delta: "84% standard rate", icon: CheckCircle, iconColor: "text-brand-success bg-emerald-50" },
          { label: "Pending Escalations", value: "8,000", delta: "Assigned & under review", icon: AlertOctagon, iconColor: "text-red-500 bg-red-50" },
          { label: "Customer Loyalty Index", value: "89%", delta: "Consistent month-over-month", icon: User, iconColor: "text-brand-primary bg-brand-primary-soft" }
        ].map((stat, i) => (
          <div key={i} className="bg-brand-card p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
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

      {/* Executive Forecast & Signals Analysis Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Corporate Weekly Signals Trend */}
        <div className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-base text-brand-secondary">Corporate Inflow Volumes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Macro intelligence tracking incoming case signals daily</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-primary-soft text-brand-primary text-xs font-semibold rounded-lg font-mono">
                <TrendingUp className="w-3.5 h-3.5" /> +14.2% Growth
              </div>
            </div>
            <div className="relative pt-4 h-44 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="corpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
                    <stop offset="50%" stopColor="#6366F1" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="var(--color-brand-bg)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="corpLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(15, 23, 42, 0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(15, 23, 42, 0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(15, 23, 42, 0.06)" strokeDasharray="3 3" />

                {/* Filled Area */}
                <motion.path
                  d="M 10 90 Q 90 60 170 80 T 330 30 T 490 50 L 490 120 L 10 120 Z"
                  fill="url(#corpAreaGrad)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.1 }}
                />

                {/* Smooth Curve path */}
                <motion.path
                  d="M 10 90 Q 90 60 170 80 T 330 30 T 490 50"
                  fill="none"
                  stroke="url(#corpLineGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.3, ease: "easeInOut" }}
                />

                {/* Circles for nodes */}
                {[
                  { x: 10, y: 90, val: "15k" },
                  { x: 90, y: 60, val: "18k" },
                  { x: 170, y: 80, val: "25k" },
                  { x: 250, y: 45, val: "22k" },
                  { x: 330, y: 30, val: "30k" },
                  { x: 410, y: 70, val: "14k" },
                  { x: 490, y: 50, val: "10k" },
                ].map((pt, idx) => (
                  <g key={idx} className="group/node">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      className="fill-white stroke-[#38BDF8] stroke-[2px] transition-all duration-200 hover:r-6.5 cursor-pointer"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-[#38BDF8] font-bold opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-none"
                    >
                      {pt.val}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <div className="flex justify-between px-1 text-[10px] font-mono font-bold text-slate-400 mt-2 pt-2 border-t border-slate-100/50">
            <span>Mon (15k)</span>
            <span>Tue (18k)</span>
            <span>Wed (25k)</span>
            <span>Thu (22k)</span>
            <span>Fri (30k)</span>
            <span>Sat (14k)</span>
            <span>Sun (10k)</span>
          </div>
        </div>

        {/* Graph 2: Case Severity Segment Distribution */}
        <div className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-base text-brand-secondary">SLA Severity Allocation</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time proportions across corporate log indexes</p>
          </div>

          <div className="space-y-3.5 my-4">
            {[
              { level: "Critical Priority", pct: 15, color: "from-[#38BDF8] to-brand-warning" },
              { level: "High Priority", pct: 35, color: "from-[#6366F1] to-[#38BDF8]" },
              { level: "Medium Priority", pct: 38, color: "from-[#312E81] to-[#6366F1]" },
              { level: "Low Routine Priority", pct: 12, color: "from-[#1E1B4B] via-[#312E81] to-[#6366F1]" },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>{item.level}</span>
                  <span className="font-mono text-brand-secondary font-bold">{item.pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.9, delay: idx * 0.15 }}
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 leading-normal font-medium">
            Risk engines constantly recalculate segment shares based on real-time escalation.
          </p>
        </div>
      </div>

      {/* Departments Table / Detail Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="font-display font-semibold text-base text-brand-secondary mb-4">Department Operational Health</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 text-xs font-semibold uppercase text-slate-400 tracking-wider">Department Unit</th>
                  <th className="py-3 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Resolution Pace (SLA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deptsData.map((d, i) => {
                  const barGradients = [
                    "from-[#312E81] to-[#4F46E5]",
                    "from-[#4F46E5] to-[#06B6D4]",
                    "from-[#06B6D4] to-[#14B8A6]",
                    "from-[#1E1B4B] via-[#4F46E5] to-[#06B6D4]",
                    "from-[#4F46E5] via-[#06B6D4] to-[#14B8A6]"
                  ];
                  const gradientClass = barGradients[i % barGradients.length];
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 text-sm font-semibold text-slate-700">{d.name}</td>
                      <td className="py-4 text-right">
                        <div className="inline-flex items-center gap-3 w-full max-w-[200px] justify-end">
                          <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className={`h-full bg-gradient-to-r ${gradientClass} rounded-full`} style={{ width: `${d.pct}%` }} />
                          </div>
                          <span className="text-xs font-mono font-bold text-brand-secondary">{d.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Business Predictive Cards */}
        <div className="bg-gradient-to-br from-indigo-50/20 via-sky-50/10 to-white p-6 rounded-2xl border border-brand-primary/15 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-indigo-100/50 pb-2">
              <div className="p-1 bg-brand-primary-soft text-brand-primary rounded-lg">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <h3 className="font-display font-bold text-base text-brand-secondary">Strategic AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60 text-xs shadow-xs text-slate-800">
                <strong className="text-amber-700 uppercase tracking-wide block mb-1 font-bold">Logistics Overload</strong>
                Delivery complaints rose by <strong className="text-amber-900 font-bold">30%</strong> in metropolitan sorting facilities due to routing bottleneck anomalies.
              </div>
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200/60 text-xs shadow-xs text-slate-800">
                <strong className="text-red-700 uppercase tracking-wide block mb-1 font-bold">Billing Escalation</strong>
                Transaction failures are currently the highest priority risk vector. Payments ledger audit recommended.
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 mt-4 leading-normal bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            🔮 <strong className="text-slate-800">Predictive projection:</strong> Anticipating an increase in refund-related logs next quarter unless gateway timeouts are mitigated.
          </p>
        </div>
      </div>

      {/* Critical alerts table */}
      <div className="bg-brand-card p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-display font-semibold text-base text-brand-secondary mb-4">Critical Issue Incidents Tracker</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3">Critical Incident Target</th>
                <th className="py-3">Clustering Type</th>
                <th className="py-3">Linked Signals</th>
                <th className="py-3">Severity</th>
                <th className="py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium">
              {[
                { issue: "Payment gateway failure logs", cat: "Payment", reports: 340, sev: "Critical", status: "Pending" },
                { issue: "Metro hub distribution bottlenecks", cat: "Delivery", reports: 9000, sev: "High", status: "In Progress" },
                { issue: "Legacy authentication reset failure", cat: "Account", reports: 800, sev: "High", status: "In Progress" },
                { issue: "Package structural damage logs", cat: "Product", reports: 412, sev: "Medium", status: "Pending" },
                { issue: "Escalated SLA refund delays > 15d", cat: "Refund", reports: 265, sev: "Medium", status: "Resolved" }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 text-slate-700 font-semibold">{row.issue}</td>
                  <td className="py-4 text-slate-500 text-xs">{row.cat}</td>
                  <td className="py-4 font-mono text-brand-secondary font-bold">{row.reports.toLocaleString()}</td>
                  <td className="py-4">
                    {row.sev === "Critical" ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-red-50 text-red-500 border border-red-100">Critical</span>
                    ) : row.sev === "High" ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-50 text-brand-warning border border-amber-100">High</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-slate-50 text-slate-500 border border-slate-100">Medium</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {row.status === "Resolved" ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-50 text-brand-success border border-emerald-100">Resolved</span>
                    ) : row.status === "In Progress" ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-brand-primary-soft text-brand-primary border border-brand-primary/20">In Progress</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-slate-100 text-slate-400 border border-slate-200">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
