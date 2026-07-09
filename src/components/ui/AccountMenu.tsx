"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Key, FileText, ChevronRight, Loader2 } from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { supabase } from "@/lib/supabase";
import { getScripts, Script } from "@/lib/storage";
import { ChangePasswordModal } from "./ChangePasswordModal";
import toast from "react-hot-toast";

export const AccountMenu = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string; initial?: string } | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(menuRef, () => {
    if (isOpen) setIsOpen(false);
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        const email = user.email || "";
        const name = user.user_metadata?.full_name || email.split("@")[0] || "User";
        const initial = name ? name.charAt(0).toUpperCase() : "?";
        setUser({ email, name, initial });
      }
    };
    fetchUser();
  }, []);

  // Lazy fetch scripts when menu opens
  useEffect(() => {
    if (isOpen) {
      const fetchScripts = async () => {
        setIsLoadingScripts(true);
        try {
          const fetched = await getScripts();
          setScripts(fetched);
        } catch (err) {
          console.error("Failed to fetch scripts:", err);
        } finally {
          setIsLoadingScripts(false);
        }
      };
      fetchScripts();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !showPasswordModal) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showPasswordModal]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully!");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
        >
          {user.initial}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
            >
              {/* Section 1: User Info */}
              <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3 bg-[#131313]">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-300 shrink-0">
                  {user.initial}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-white truncate">{user.name}</span>
                  <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                </div>
              </div>

              {/* Section 2: My Scripts */}
              <div className="flex flex-col py-2 border-b border-[#2a2a2a]">
                <div className="px-4 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">My Scripts</span>
                  {isLoadingScripts && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
                </div>
                
                <div className="flex flex-col">
                  {!isLoadingScripts && scripts.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-zinc-400">
                      No scripts yet.{" "}
                      <button 
                        onClick={() => { setIsOpen(false); router.push("/"); }} 
                        className="text-[#c9a84c] hover:underline inline-flex items-center"
                      >
                        Create one <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  ) : (
                    scripts.slice(0, 5).map((script) => (
                      <button
                        key={script.id}
                        onClick={() => { setIsOpen(false); router.push(`/editor/${script.id}`); }}
                        className="flex items-center justify-between px-4 py-2 text-sm text-zinc-300 hover:bg-[#2a2a2a] hover:text-[#c9a84c] transition-colors group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                          <span className="truncate">{script.title || "Untitled Script"}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0 ml-2">
                          Open <ChevronRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </button>
                    ))
                  )}
                  
                  {!isLoadingScripts && scripts.length > 0 && (
                    <button
                      onClick={() => { setIsOpen(false); router.push("/"); }}
                      className="px-4 py-2 mt-1 text-xs text-[#c9a84c] hover:text-[#e0c26c] transition-colors text-left flex items-center"
                    >
                      View all scripts <ChevronRight className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Account Actions */}
              <div className="flex flex-col py-2">
                <button
                  onClick={() => { setIsOpen(false); setShowPasswordModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-[#2a2a2a] hover:text-[#c9a84c] transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
};
