import { X, LogOut, Mail, Briefcase, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, onClose, user, onLogout }: SidebarProps) {
  const firstLetter = user.name.charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-brand-card shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-display font-bold text-lg text-brand-secondary">User Profile</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-brand-secondary transition"
                aria-label="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Detail Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-warning text-white flex items-center justify-center font-display font-bold text-3xl shadow-lg shadow-brand-primary/20 mb-4">
                {firstLetter}
              </div>
              <h3 className="font-display font-bold text-xl text-brand-secondary">{user.name}</h3>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary-soft text-brand-primary text-xs font-semibold rounded-full border border-brand-primary/20 uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5" />
                {user.role === "authority" ? "Administrator" : "Employee"}
              </div>

              {/* Stats / Details */}
              <div className="w-full mt-8 space-y-4 border-t border-slate-100 pt-6">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email Address</div>
                    <div className="text-sm font-medium text-brand-secondary break-all">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Briefcase className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Department</div>
                    <div className="text-sm font-medium text-brand-secondary">{user.dept}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Sign-out */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-100 hover:bg-red-100/70 text-red-600 font-semibold rounded-xl text-sm transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out from ResolveAI
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
