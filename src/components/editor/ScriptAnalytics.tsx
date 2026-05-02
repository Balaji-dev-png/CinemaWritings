"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Users, MapPin, Film, BarChart3, Clock, BookOpen } from "lucide-react";

interface AnalyticsData {
  characters: { name: string; count: number }[];
  locations: { name: string; type: string; count: number }[];
  sceneCount: number;
  intCount: number;
  extCount: number;
  dayCount: number;
  nightCount: number;
  wordCount: number;
  pageEstimate: number;
  dialogueWords: number;
  actionWords: number;
  estimatedRuntime: number;
}

export function ScriptAnalytics({ editor }: { editor: Editor | null }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<"chars" | "locs" | "stats">("stats");

  useEffect(() => {
    if (!editor) return;

    const analyze = () => {
      const charMap = new Map<string, number>();
      const locMap = new Map<string, { type: string; count: number }>();
      let scenes = 0, intC = 0, extC = 0, dayC = 0, nightC = 0;
      let dialogueWords = 0, actionWords = 0;
      let totalWords = 0;

      editor.state.doc.descendants((node) => {
        const text = node.textContent.trim();

        if (node.type.name === "character" && text) {
          const name = text.toUpperCase();
          charMap.set(name, (charMap.get(name) || 0) + 1);
        }

        if (node.type.name === "sceneHeading" && text) {
          scenes++;
          const upper = text.toUpperCase();
          if (upper.startsWith("INT.")) intC++;
          if (upper.startsWith("EXT.")) extC++;
          if (upper.includes("INT./EXT.")) { intC++; extC++; }
          if (upper.includes("DAY")) dayC++;
          if (upper.includes("NIGHT")) nightC++;

          const locMatch = text.match(/^(?:INT\.|EXT\.|INT\.\/EXT\.)\s+(.+?)(?:\s+-\s+|$)/i);
          if (locMatch?.[1]) {
            const loc = locMatch[1].toUpperCase();
            const type = upper.startsWith("INT.") ? "INT" : upper.startsWith("EXT.") ? "EXT" : "INT/EXT";
            const existing = locMap.get(loc);
            locMap.set(loc, { type: existing?.type || type, count: (existing?.count || 0) + 1 });
          }
        }

        if (node.type.name === "dialogue") {
          dialogueWords += text.split(/\s+/).filter(Boolean).length;
        }
        if (node.type.name === "action") {
          actionWords += text.split(/\s+/).filter(Boolean).length;
        }

        if (node.isText && node.text) {
          totalWords += node.text.split(/\s+/).filter(Boolean).length;
        }
      });

      const characters = Array.from(charMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const locations = Array.from(locMap.entries())
        .map(([name, v]) => ({ name, type: v.type, count: v.count }))
        .sort((a, b) => b.count - a.count);

      const pageEstimate = Math.max(1, Math.ceil(totalWords / 250));

      setData({
        characters,
        locations,
        sceneCount: scenes,
        intCount: intC,
        extCount: extC,
        dayCount: dayC,
        nightCount: nightC,
        wordCount: totalWords,
        pageEstimate,
        dialogueWords,
        actionWords,
        estimatedRuntime: pageEstimate,
      });
    };

    analyze();
    editor.on("update", analyze);
    return () => { editor.off("update", analyze); };
  }, [editor]);

  if (!data) return null;

  const ratio = data.dialogueWords + data.actionWords > 0
    ? Math.round((data.dialogueWords / (data.dialogueWords + data.actionWords)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800">
        {([
          { key: "stats", icon: BarChart3, label: "Stats" },
          { key: "chars", icon: Users, label: "Characters" },
          { key: "locs", icon: MapPin, label: "Locations" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.key
                ? "text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white"
                : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ── Stats Tab ── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Words", value: data.wordCount.toLocaleString(), icon: BookOpen },
                { label: "Pages", value: data.pageEstimate, icon: Film },
                { label: "Scenes", value: data.sceneCount, icon: BarChart3 },
                { label: "Runtime", value: `~${data.estimatedRuntime}m`, icon: Clock },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center">
                  <stat.icon className="w-3.5 h-3.5 mx-auto mb-1.5 text-zinc-400" />
                  <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{stat.value}</div>
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* INT/EXT Breakdown */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Scene Breakdown</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-medium border border-blue-200 dark:border-blue-800/50 flex gap-1.5"><span className="opacity-70">INT</span> {data.intCount}</span>
                <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg font-medium border border-green-200 dark:border-green-800/50 flex gap-1.5"><span className="opacity-70">EXT</span> {data.extCount}</span>
                <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg font-medium border border-amber-200 dark:border-amber-800/50 flex gap-1.5"><span className="opacity-70">DAY</span> {data.dayCount}</span>
                <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg font-medium border border-purple-200 dark:border-purple-800/50 flex gap-1.5"><span className="opacity-70">NIGHT</span> {data.nightCount}</span>
              </div>
            </div>

            {/* Dialogue-to-Action Ratio */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Dialogue vs Action</div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out" style={{ width: `${ratio}%` }} />
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 flex-1 transition-all duration-700 ease-out" />
              </div>
              <div className="flex justify-between mt-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <span className="text-blue-600 dark:text-blue-400">Dialogue {ratio}%</span>
                <span className="text-orange-600 dark:text-orange-500">Action {100 - ratio}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Characters Tab ── */}
        {activeTab === "chars" && (
          <div className="space-y-1">
            {data.characters.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-8">No characters detected yet.</p>
            )}
            {data.characters.map((c) => (
              <div key={c.name} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 font-mono">{c.name}</span>
                <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  {c.count} line{c.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Locations Tab ── */}
        {activeTab === "locs" && (
          <div className="space-y-1">
            {data.locations.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-8">No locations detected yet.</p>
            )}
            {data.locations.map((l) => (
              <div key={l.name} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    l.type === "INT" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-green-100 dark:bg-green-900/30 text-green-600"
                  }`}>{l.type}</span>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">{l.name}</span>
                </div>
                <span className="text-[10px] text-zinc-400">{l.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
