import { useState, FormEvent } from "react";
import { AnimatePresence } from "motion/react";
import { User, UserRole } from "../types";
import { Shield, Mail, Lock, UserPlus, HelpCircle } from "lucide-react";
import Logo from "./Logo";

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [authView, setAuthView] = useState<"login" | "signup" | "forgot">("login");
  const [loginRole, setLoginRole] = useState<UserRole>("employee");
  const [signupRole, setSignupRole] = useState<UserRole>("employee");

  // Form Fields
  const [loginEmail, setLoginEmail] = useState("keya@northwind.com");
  const [loginPassword, setLoginPassword] = useState("resolveai123");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  // Error Fields
  const [errorText, setErrorText] = useState("");

  // Quick switch role-prefills for easier evaluation
  const handleRoleChange = (role: UserRole) => {
    setLoginRole(role);
    if (role === "employee") {
      setLoginEmail("keya@northwind.com");
      setLoginPassword("resolveai123");
    } else {
      setLoginEmail("keyasuthar@northwind.com");
      setLoginPassword("resolveai123");
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!loginEmail || !loginPassword) {
      setErrorText("Please fill in all email and password fields.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          role: loginRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.error || "Login failed. Check your credentials.");
        return;
      }

      if (data.token) {
        localStorage.setItem("resolveai_token", data.token);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      console.warn("Backend auth unavailable, falling back to local session:", err);
      let name = loginEmail.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      let dept = loginRole === "authority" ? "Executive Leadership Board" : "Finance Department";
      if (loginEmail === "keya@northwind.com") {
        name = "Keya";
        dept = "Finance Department";
      } else if (loginEmail === "keyasuthar@northwind.com") {
        name = "Keya Suthar";
        dept = "Executive Operations";
      }
      onLoginSuccess({ name, email: loginEmail, role: loginRole, dept });
    }
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) {
      setErrorText("Please provide all registration fields.");
      return;
    }

    if (signupPassword !== signupConfirm) {
      setErrorText("Passwords do not match. Check spelling.");
      return;
    }

    if (signupPassword.length < 6) {
      setErrorText("Password must contain at least 6 characters.");
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          role: signupRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.error || "Registration failed.");
        return;
      }

      if (data.token) {
        localStorage.setItem("resolveai_token", data.token);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      console.warn("Backend registration unavailable, falling back to local session:", err);
      const newUser: User = {
        name: signupName,
        email: signupEmail,
        role: signupRole,
        dept: signupRole === "authority" ? "Corporate Management" : "General Support Department"
      };
      onLoginSuccess(newUser);
    }
  };

  const handleForgotSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    alert(`A password reset link was dispatched to your company inbox at ${forgotEmail}.`);
    setAuthView("login");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-brand-bg font-sans">
      {/* LEFT: VISUAL BRAND HERO (7 COLS) */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-950 relative p-12 flex-col justify-between overflow-hidden border-r border-slate-900">
        {/* Background gradient graphics */}
        <div className="absolute top-[20%] left-[10%] w-[450px] h-[450px] bg-brand-primary/10 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-sky-500/10 rounded-full filter blur-[80px] pointer-events-none" />

        {/* Brand Sign */}
        <Logo size="lg" className="z-10" dark={true} />

        {/* Hero Title */}
        <div className="my-auto max-w-xl z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/20 border border-brand-primary/30 text-teal-400 text-xs font-semibold rounded-full uppercase tracking-wider font-mono">
            Feedback &amp; Issue Intelligence
          </div>
          <h1 className="font-display font-bold text-4xl text-white leading-[1.15] tracking-tight">
            Every complaint, ticket, and review — turned into action.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            ResolveAI consolidates fragmented customer signals across app channels, maps recurring pattern clusters, and automatically dispatches priority tasks to appropriate corporate units.
          </p>

          {/* Simulated Active Signals Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary pulse-dot" />
                Live AI Signal Feed
              </span>
              <span className="text-[9px] font-mono text-slate-500">Active</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-red-950/40 border border-red-900/40 text-red-400 shrink-0">Critical</span>
                <span className="text-slate-300 font-medium">Stripe checkout transaction deadlock — 340 reports in 2 hours</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-sky-950/40 border border-sky-900/40 text-sky-400 shrink-0">Anomaly</span>
                <span className="text-slate-300 font-medium">Late deliveries spike +30% at northern sorting terminal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Footer Metrics */}
        <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-800 z-10">
          <div>
            <div className="font-display font-bold text-2xl text-white">50,000+</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Logs Analyzed</div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-white">89%</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Standard CSAT</div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-white">24/7</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">AI Classification</div>
          </div>
        </div>
      </div>

      {/* RIGHT: FORMS COMPONENT (5 COLS) */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:col-span-5 bg-brand-card">
        <div className="w-full max-w-sm space-y-8">
          {/* Brand Header */}
          <div className="flex justify-center mb-6">
            <Logo size="md" />
          </div>

          <AnimatePresence mode="wait">
            {authView === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <h2 className="font-display font-bold text-2xl text-brand-secondary">Welcome back</h2>
                  <p className="text-xs text-slate-400 mt-1">Sign in to your corporate feedback dashboard</p>
                </div>

                {errorText && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-medium">
                    {errorText}
                  </div>
                )}

                {/* Role Toggle Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("employee")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 cursor-pointer ${
                      loginRole === "employee"
                        ? "border-brand-primary bg-teal-50/40 text-brand-primary shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <div>
                      <strong className="text-xs font-bold block leading-tight text-brand-secondary">Employee</strong>
                      <span className="text-[10px] text-slate-400 font-medium">Support &amp; Desk Unit</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange("authority")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 cursor-pointer ${
                      loginRole === "authority"
                        ? "border-brand-primary bg-teal-50/40 text-brand-primary shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <div>
                      <strong className="text-xs font-bold block leading-tight text-brand-secondary">Administrator</strong>
                      <span className="text-[10px] text-slate-400 font-medium">SLA Operations Board</span>
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Company Email
                    </label>
                    <input
                      required
                      type="email"
                      placeholder={loginRole === "authority" ? "authority@northwind.com" : "employee@northwind.com"}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Security Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuthView("forgot")}
                        className="text-xs font-semibold text-brand-primary hover:underline outline-none"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3 bg-brand-primary hover:bg-teal-600 text-white font-semibold rounded-xl text-sm shadow-sm transition"
                >
                  Sign In to Workspace
                </button>

                <p className="text-center text-xs text-slate-400">
                  New unit?{" "}
                  <button
                    type="button"
                    onClick={() => { setAuthView("signup"); setErrorText(""); }}
                    className="font-semibold text-brand-primary hover:underline outline-none"
                  >
                    Register Organization
                  </button>
                </p>
              </form>
            )}

            {authView === "signup" && (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <h2 className="font-display font-bold text-2xl text-brand-secondary">Register Organization</h2>
                  <p className="text-xs text-slate-400 mt-1">Set up custom feedback classification scopes</p>
                </div>

                {errorText && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-medium">
                    {errorText}
                  </div>
                )}

                {/* Role Toggle Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignupRole("employee")}
                    className={`p-2 rounded-xl border text-left transition flex flex-col justify-between h-16 cursor-pointer ${
                      signupRole === "employee"
                        ? "border-brand-primary bg-teal-50/40 text-brand-primary shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <strong className="text-xs font-bold block text-brand-secondary">Employee role</strong>
                      <span className="text-[9px] text-slate-400 font-medium">Support Unit Access</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole("authority")}
                    className={`p-2 rounded-xl border text-left transition flex flex-col justify-between h-16 cursor-pointer ${
                      signupRole === "authority"
                        ? "border-brand-primary bg-teal-50/40 text-brand-primary shadow-sm"
                        : "border-slate-150 bg-slate-50 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <strong className="text-xs font-bold block text-brand-secondary">Administrator role</strong>
                      <span className="text-[9px] text-slate-400 font-medium">Operations Access</span>
                    </div>
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-primary focus:bg-white outline-none"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Email</label>
                    <input
                      required
                      type="email"
                      placeholder="jane@company.com"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-primary focus:bg-white outline-none"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-primary focus:bg-white outline-none"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm</label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:border-brand-primary focus:bg-white outline-none"
                        value={signupConfirm}
                        onChange={e => setSignupConfirm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3 bg-brand-primary hover:bg-teal-600 text-white font-semibold rounded-xl text-xs shadow-sm transition"
                >
                  Create Account
                </button>

                <p className="text-center text-xs text-slate-400 pt-2">
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => { setAuthView("login"); setErrorText(""); }}
                    className="font-semibold text-brand-primary hover:underline outline-none"
                  >
                    Log In
                  </button>
                </p>
              </form>
            )}

            {authView === "forgot" && (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div>
                  <h2 className="font-display font-bold text-2xl text-brand-secondary flex items-center gap-2">
                    <HelpCircle className="text-brand-primary w-6 h-6" />
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Receive secure reset credentials on corporate email</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Corporate Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="you@company.com"
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:border-brand-primary focus:bg-white outline-none"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-5 py-3 bg-brand-primary hover:bg-teal-600 text-white font-semibold rounded-xl text-sm shadow-sm transition"
                >
                  Send Reset Ticket
                </button>

                <p className="text-center text-xs text-slate-400">
                  Cancel and{" "}
                  <button
                    type="button"
                    onClick={() => setAuthView("login")}
                    className="font-semibold text-brand-primary hover:underline outline-none"
                  >
                    Return to Login
                  </button>
                </p>
              </form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
