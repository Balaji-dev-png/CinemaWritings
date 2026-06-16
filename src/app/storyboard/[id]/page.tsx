"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Film, Download, Loader2, LayoutGrid, Home, BookOpen, FileCode } from "lucide-react";
import { getStoryboard, Storyboard } from "@/lib/storyboard-api";
import { StoryboardView } from "@/components/storyboard/StoryboardView";
import { isAuthenticated } from "@/lib/auth";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export default function StoryboardPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Instant navigation overlay
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMessage, setNavMessage] = useState("");
  const navigateTo = (path: string, msg = "Loading...") => {
    setNavMessage(msg);
    setIsNavigating(true);
    router.push(path);
  };

  useEffect(() => {
    const init = async () => {
      const authed = await isAuthenticated();
      if (!authed) { router.push("/login"); return; }
      try {
        const sb = await getStoryboard(scriptId);
        setStoryboard(sb);
      } catch {
        setError("Failed to load storyboard.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [scriptId, router]);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-[#0d0d0d] text-zinc-900 dark:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <LoadingOverlay isVisible={isNavigating} message={navMessage} />
      {/* Top Header */}
      <header className="flex items-center gap-4 px-6 py-3 shrink-0 bg-white dark:bg-[#111] border-b border-zinc-200 dark:border-[#222]" style={{ position: "sticky", top: 0, zIndex: 40 }}>
        <button
          onClick={() => navigateTo(`/`, "Going Home...")}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          Home
        </button>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
        
        <button
          onClick={() => navigateTo(`/editor/${scriptId}`, "Back to Editor...")}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Editor
        </button>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />
        <button
          onClick={() => navigateTo(`/directors-suite/${scriptId}`, "Opening Director's Suite...")}
          className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <LayoutGrid className="w-3 h-3" /> Director&apos;s Suite
        </button>




        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex items-center gap-2 group">
          <Film className="w-4 h-4" style={{ color: "#c9a84c" }} />
          {storyboard && (
            <input
              className="bg-transparent text-sm font-bold outline-none border-b border-transparent hover:border-[#c9a84c]/30 focus:border-[#c9a84c] transition-colors"
              style={{ color: "#c9a84c" }}
              value={storyboard.script_title}
              onChange={(e) => setStoryboard({ ...storyboard, script_title: e.target.value })}
              onBlur={async () => {
                if (storyboard) {
                  await import("@/lib/storyboard-api").then((m) => m.updateStoryboard(scriptId, { script_title: storyboard.script_title }));
                }
              }}
              placeholder="Storyboard Name"
            />
          )}
          <span className="text-zinc-400 dark:text-zinc-500 text-xs">— Visual Storyboard</span>
        </div>

        <div className="flex-1" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9a84c" }} />
            <span className="text-zinc-500 text-sm">Loading storyboard...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : storyboard ? (
          <motion.div
            className="flex-1 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <StoryboardView
              storyboard={storyboard}
              onStoryboardChange={setStoryboard}
              scriptTitle={storyboard.script_title || "Storyboard"}
              scriptId={scriptId}
            />
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}
