"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Key, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { supabase } from "@/lib/supabase";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState<{ current?: string; new?: string; confirm?: string; general?: string }>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError({});
    setSuccess(false);
    onClose();
  }, [onClose]);

  // Close on outside click
  useOutsideClick(modalRef, () => {
    if (!isLoading) handleClose();
  });

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, handleClose]);

  const validate = () => {
    const newErrors: typeof error = {};
    if (!currentPassword) newErrors.current = "Current password is required";
    if (newPassword.length < 8) newErrors.new = "New password must be at least 8 characters";
    if (newPassword !== confirmPassword) newErrors.confirm = "Passwords do not match";
    
    setError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError({});
    setSuccess(false);

    try {
      // Supabase updateUser allows changing password directly if user is logged in
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError({ general: updateError.message });
      } else {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (err: any) {
      setError({ general: err.message || "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#c9a84c]" />
                <h2 className="text-lg font-medium text-white">Change Password</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium text-white mb-2">Password updated successfully ✓</p>
                  <p className="text-sm text-zinc-400">You can now use your new password.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error.general && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-400">{error.general}</p>
                    </div>
                  )}

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isLoading}
                      className={`w-full bg-[#0a0a0a] border ${error.current ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c] transition-colors pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-[32px] text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {error.current && <p className="text-xs text-red-400 mt-1.5">{error.current}</p>}
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                      New Password
                    </label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      className={`w-full bg-[#0a0a0a] border ${error.new ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c] transition-colors pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-[32px] text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {error.new && <p className="text-xs text-red-400 mt-1.5">{error.new}</p>}
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className={`w-full bg-[#0a0a0a] border ${error.confirm ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c] transition-colors pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-[32px] text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {error.confirm && <p className="text-xs text-red-400 mt-1.5">{error.confirm}</p>}
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#c9a84c] hover:bg-[#d4b55a] text-black font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
