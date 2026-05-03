"use client";

import { useState, useEffect } from "react";
import { saveVersion, restoreVersion, getScriptById, Script, ScriptVersion } from "@/lib/storage";
import { Save, RotateCcw, X, Clock, Tag, SplitSquareHorizontal } from "lucide-react";
import { CompareModal } from "./CompareModal";

export function VersionManager({
  scriptId,
  currentContent,
  onRestore,
  onClose,
}: {
  scriptId: string;
  currentContent: string;
  onRestore: (newContent: string) => void;
  onClose: () => void;
}) {
  const [script, setScript] = useState<Script | null>(null);
  const [versionName, setVersionName] = useState("");
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [saved, setSaved] = useState(false);
  const [comparingVersion, setComparingVersion] = useState<{ content: string; name: string } | null>(null);

  useEffect(() => {
    getScriptById(scriptId).then((found) => {
      if (found) {
        setScript(found);
        setVersions(found.versions || []);
      }
    });
  }, [scriptId]);

  const handleSave = async () => {
    const name = versionName.trim() || `Draft ${versions.length + 1}`;
    await saveVersion(scriptId, name);
    const updated = await getScriptById(scriptId);
    setVersions(updated?.versions || []);
    setVersionName("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRestore = async (index: number) => {
    const content = await restoreVersion(scriptId, index);
    if (content) onRestore(content);
  };

  const handleCompare = async (index: number, name: string) => {
    const content = await restoreVersion(scriptId, index);
    if (content) setComparingVersion({ content, name });
  };

  if (comparingVersion) {
    return (
      <CompareModal
        currentContent={currentContent}
        savedContent={comparingVersion.content}
        versionName={comparingVersion.name}
        onClose={() => setComparingVersion(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            Version History
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save New Version */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex gap-2">
          <input
            type="text"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="Version name (e.g., Draft 2)"
            className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
          />
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
              saved
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? "Saved!" : "Save"}
          </button>
        </div>

        {/* Version List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {versions.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-8">No versions saved yet.</p>
          )}
          {versions.slice().reverse().map((v, i) => {
            const realIndex = versions.length - 1 - i;
            return (
              <div key={i} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{v.name}</div>
                    <div className="text-[10px] text-zinc-400">{new Date(v.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCompare(realIndex, v.name)}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                  >
                    <SplitSquareHorizontal className="w-3 h-3" />
                    Compare
                  </button>
                  <button
                    onClick={() => handleRestore(realIndex)}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
