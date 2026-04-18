"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History as HistoryIcon, X } from "lucide-react";
import { getScripts, createScript, deleteScript, Script, HistoryEvent } from "@/lib/storage";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Pastel gradient arrays matching the image's vibrant but soft card styles
const PASTEL_GRADIENTS = [
  "bg-gradient-to-br from-[#f8f5ff] to-[#eaddff] border-[#eaddff] text-zinc-800 dark:from-purple-900/30 dark:to-purple-900/10 dark:text-zinc-200 dark:border-purple-800",
  "bg-gradient-to-br from-[#f0f7ff] to-[#d6e8ff] border-[#d6e8ff] text-zinc-800 dark:from-blue-900/30 dark:to-blue-900/10 dark:text-zinc-200 dark:border-blue-800",
  "bg-gradient-to-br from-[#fff7f0] to-[#ffe5cc] border-[#ffe5cc] text-zinc-800 dark:from-orange-900/30 dark:to-orange-900/10 dark:text-zinc-200 dark:border-orange-800",
  "bg-gradient-to-br from-[#f2fcf5] to-[#dcfce7] border-[#dcfce7] text-zinc-800 dark:from-green-900/30 dark:to-green-900/10 dark:text-zinc-200 dark:border-green-800",
];

export default function Dashboard() {
  const router = useRouter();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeHistory, setActiveHistory] = useState<HistoryEvent[] | null>(null);

  // Floating theme toggle — only on dashboard
  const themeToggle = (
    <div className="fixed top-8 right-8 z-50">
      <ThemeToggle />
    </div>
  );

  useEffect(() => {
    setScripts(getScripts());
  }, []);

  const handleCreate = () => {
    const newScript = createScript();
    router.push(`/editor/${newScript.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteScript(id);
    setScripts(getScripts());
  };

  const handleShowHistory = (e: React.MouseEvent, script: Script) => {
    e.stopPropagation();
    setActiveHistory(script.historyList || []);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#0a0a0a] flex items-center justify-center p-4 sm:p-8 font-sans transition-colors duration-500">
      {themeToggle}
      {/* Massive floating white pane mimicking the image container */}
      <div className="w-full max-w-6xl bg-white dark:bg-[#131416] rounded-2xl sm:rounded-[3rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.06)] dark:shadow-black/50 overflow-hidden border border-white dark:border-[#222] flex flex-col p-5 sm:p-8 md:p-12 min-h-[85vh] relative transition-colors duration-500">
        
        {/* Top Header Section */}
        <div className="flex flex-col items-center mt-6 text-center z-10 relative">
          
          {/* Solution Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6 transition-colors duration-500">
            <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">Screenplay</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-[#1c1d20] dark:text-zinc-100 max-w-2xl leading-tight mb-4 transition-colors duration-500">
            Write your masterpiece in a beautiful environment
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto leading-relaxed transition-colors duration-500">
            Effortlessly organize your scripts, format everything in WGA standards, and manage your entire production process behind the scenes.
          </p>

        </div>

        {/* Action Center (Matching the black pill button in the image) */}
        <div className="flex justify-center mt-8 sm:mt-12 mb-8 sm:mb-16 relative z-10">
          <button 
            onClick={handleCreate}
            className="group flex items-center gap-3 bg-[#1c1d20] dark:bg-zinc-100 hover:bg-black dark:hover:bg-white text-white dark:text-black px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="grid grid-cols-2 gap-0.5 opacity-80 group-hover:opacity-100">
              <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
              <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
              <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
              <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
            </div>
            <span className="font-medium mr-2">New Script</span>
          </button>
        </div>

        {/* Scripts Grid Matrix (Pastel Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-10 w-full max-w-5xl mx-auto flex-1">
          {scripts.map((script, index) => {
            const gradient = PASTEL_GRADIENTS[index % PASTEL_GRADIENTS.length];
            return (
              <div 
                key={script.id}
                onClick={() => router.push(`/editor/${script.id}`)}
                className={`${gradient} relative flex flex-col p-5 sm:p-7 rounded-2xl sm:rounded-[2rem] border shadow-sm hover:shadow-md transition-all cursor-pointer group h-56 sm:h-72`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white/80 dark:bg-black/50 rounded-md shadow-sm flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                    </div>
                    <span className="text-sm font-semibold line-clamp-1">{script.title || "Untitled"}</span>
                  </div>
                </div>

                <p className="text-xs opacity-70 mb-6 line-clamp-2">
                  Gain real-time insights into your revisions, track scene counts and formatting.
                </p>

                {/* Internal floating styling block mimicking the UI details inside the cards in image */}
                <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 mt-auto border border-white/50 dark:border-white/10 shadow-sm transition-transform group-hover:-translate-y-1">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[10px] uppercase font-bold opacity-50 mb-1">Edited</span>
                      <span className="text-xl font-medium">{new Date(script.updatedAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleShowHistory(e, script)}
                        className="p-2 rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        title="View History"
                      >
                        <HistoryIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, script.id)}
                        className="text-[10px] bg-red-100/80 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-2 rounded-full font-bold uppercase transition-colors hover:bg-red-200 dark:hover:bg-red-900"
                      >
                        Delete
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
        
        {/* Ambient aesthetic background lines mapping exactly to image wiring */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-10 space-y-4">
           {/* We can just use gradients indicating the tree connections, or leave clean */}
           <div className="absolute top-[40%] left-1/2 w-[80%] h-px bg-zinc-300 dark:bg-zinc-700 -translate-x-1/2 -z-10" />
           <div className="absolute top-[40%] left-1/2 w-px h-[20%] bg-zinc-300 dark:bg-zinc-700 -z-10" />
           <div className="absolute top-[40%] left-[10%] w-px h-[25%] bg-zinc-300 dark:bg-zinc-700 -z-10" />
           <div className="absolute top-[40%] right-[10%] w-px h-[25%] bg-zinc-300 dark:bg-zinc-700 -z-10" />
        </div>

        {/* History Modal Overlay */}
        {activeHistory && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 rounded-2xl sm:rounded-[3rem]">
             <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-md flex flex-col max-h-[70vh]">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Document History</h2>
                   <button onClick={() => setActiveHistory(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                     <X className="w-4 h-4" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                  {activeHistory.slice().reverse().map((event, idx) => (
                    <div key={idx} className="flex gap-4 relative">
                       {/* Timeline Line */}
                       {idx !== activeHistory.length - 1 && (
                          <div className="absolute left-[11px] top-7 bottom-[-24px] w-px bg-zinc-200 dark:bg-zinc-800" />
                       )}
                       <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                         event.action === 'CREATED' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                         event.action === 'TITLE_CHANGED' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' :
                         'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                       }`}>
                         <div className="w-2 h-2 rounded-full bg-current" />
                       </div>
                       <div>
                         <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{event.action}</p>
                         <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                         {event.details && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">{event.details}</p>}
                       </div>
                    </div>
                  ))}
                  {activeHistory.length === 0 && (
                     <p className="text-sm text-zinc-500 text-center py-8">No history available yet.</p>
                  )}
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
