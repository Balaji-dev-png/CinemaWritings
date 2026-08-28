"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PenTool, ArrowRight, Clock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

// ─── Rate Limiting ────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000; // 30 seconds

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCooldown = () => {
    const until = Date.now() + COOLDOWN_MS;
    setCooldownUntil(until);
    setCooldownSeconds(Math.ceil(COOLDOWN_MS / 1000));

    cooldownTimer.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(cooldownTimer.current!);
        setCooldownUntil(null);
        setCooldownSeconds(0);
        setFailedAttempts(0);
      } else {
        setCooldownSeconds(remaining);
      }
    }, 1000);
  };

  const isInCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isInCooldown) return;

    setLoading(true);
    setIsWakingUp(false);
    setError("");

    // If the Supabase free tier is paused, it can take up to a minute to wake up
    wakeUpTimer.current = setTimeout(() => setIsWakingUp(true), 3000);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Increment failed attempts
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          startCooldown();
          setError(
            `Too many failed attempts. Please wait ${COOLDOWN_MS / 1000} seconds before trying again.`
          );
        } else {
          // Generic message — never expose the raw Supabase error
          setError(
            `Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? "" : "s"} remaining.`
          );
          toast.error("Invalid email or password.");
        }
        return;
      }

      // Success — clear password from state immediately
      setPassword("");
      toast.success("Signed in successfully!");
      router.push("/");
    } catch {
      // Generic catch — never expose internal error details
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
    } finally {
      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
      setLoading(false);
      setIsWakingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#0a0a0a] flex items-center justify-center p-4 sm:p-8 font-sans transition-colors duration-500">
      <div className="fixed top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-white dark:bg-[#131416] rounded-2xl sm:rounded-[3rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.06)] dark:shadow-black/50 overflow-hidden border border-white dark:border-[#222] flex flex-col p-8 sm:p-12 relative transition-colors duration-500"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6 transition-colors duration-500 shadow-sm">
            <PenTool className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-600 dark:text-zinc-400 uppercase">CinemaWritings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#1c1d20] dark:text-zinc-100 mb-2">
            Welcome back
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Sign in to access your writer&apos;s room
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Cooldown indicator */}
        {isInCooldown && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                Too many failed attempts
              </p>
              <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">
                Please wait <span className="font-bold tabular-nums">{cooldownSeconds}s</span> before trying again.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isInCooldown}
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isInCooldown}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || isInCooldown}
            className="w-full group flex items-center justify-center gap-3 bg-[#1c1d20] dark:bg-zinc-100 hover:bg-black dark:hover:bg-white text-white dark:text-black py-4 rounded-xl font-medium shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span>
              {loading
                ? isWakingUp
                  ? "Waking up server (may take a minute)..."
                  : "Signing in..."
                : isInCooldown
                ? `Wait ${cooldownSeconds}s`
                : "Sign In"}
            </span>
            {!loading && !isInCooldown && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={() => router.push("/signup")} className="text-[#1c1d20] dark:text-white font-medium hover:underline">
            Create an account
          </button>
        </p>
      </motion.div>
    </div>
  );
}
