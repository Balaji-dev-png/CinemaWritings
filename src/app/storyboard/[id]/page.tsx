"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Film, Download, Loader2 } from "lucide-react";
import { getStoryboard, Storyboard } from "@/lib/storyboard-api";
import { StoryboardView } from "@/components/storyboard/StoryboardView";
import { isAuthenticated } from "@/lib/auth";

export default function StoryboardPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex flex-col" style={{ background: "#080810", color: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* Top Header */}
      <header className="flex items-center gap-4 px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,8,16,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 40 }}>
        <button
          onClick={() => router.push(`/editor/${scriptId}`)}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Editor
        </button>

        <div className="w-px h-5 bg-white/10" />

        <div className="flex items-center gap-2">
          <Film className="w-4 h-4" style={{ color: "#c9a84c" }} />
          <span className="text-sm font-bold" style={{ color: "#c9a84c" }}>
            {storyboard?.script_title || "Storyboard"}
          </span>
          <span className="text-zinc-600 text-xs">— Visual Storyboard</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Download className="w-3.5 h-3.5" />
          Export Shot List
        </button>
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
            />
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}
