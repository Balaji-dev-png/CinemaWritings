"use client";

import { useState, useEffect } from "react";
import { updateScript, Script } from "@/lib/storage";

export function TitlePage({ script, docBgColor, docFont }: { script: Script; docBgColor?: string; docFont?: string }) {
  const [title, setTitle] = useState(script.title || "");
  const [author, setAuthor] = useState(script.meta?.author || "");
  const [writtenByPrefix, setWrittenByPrefix] = useState(script.meta?.writtenByPrefix || "written by");
  const [contact, setContact] = useState(script.meta?.contact || "");
  const [logline, setLogline] = useState(script.meta?.logline || "");
  const [synopsis, setSynopsis] = useState(script.meta?.synopsis || "");
  const [showExtras, setShowExtras] = useState(false);

  // Debounced auto-save
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateScript(script.id, {
        title: title || "Untitled Script",
        meta: { author, writtenByPrefix, contact, logline, synopsis },
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title, author, writtenByPrefix, contact, logline, synopsis, script.id]);

  return (
    <div className="w-full flex justify-center mb-8 page-break">
      <div
        className="script-page flex flex-col justify-between transition-all duration-300 relative border border-transparent dark:border-[#333] print:border-none"
        style={{
          backgroundColor: docBgColor && docBgColor !== "default" ? docBgColor : undefined,
          fontFamily: docFont && docFont !== "default" ? docFont : undefined,
        }}
      >
        {/* Title & Author Center Block */}
        <div className="flex-1 flex flex-col justify-center items-center h-full w-full max-w-2xl mx-auto space-y-4 md:space-y-10 pb-10 md:pb-32 title-page-content">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="SCRIPT TITLE"
            className="w-full text-center text-xl md:text-2xl uppercase tracking-widest font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 underline decoration-1 underline-offset-4 title-input"
          />
          <div className="flex flex-col items-center space-y-2 w-full text-center title-author-block">
            <input
              type="text"
              value={writtenByPrefix}
              onChange={(e) => setWrittenByPrefix(e.target.value)}
              placeholder="written by"
              className="w-full text-center text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors title-written-by"
            />
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author Name"
              className="w-full text-center bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 title-author"
            />
          </div>

          {/* Logline & Synopsis Toggle */}
          <button
            onClick={() => setShowExtras(!showExtras)}
            className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors font-bold"
          >
            {showExtras ? "Hide" : "Show"} Logline & Synopsis
          </button>

          {showExtras && (
            <div className="w-full space-y-6 mt-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Logline</label>
                <textarea
                  value={logline}
                  onChange={(e) => setLogline(e.target.value)}
                  placeholder="A one or two sentence summary of your story…"
                  className="w-full bg-transparent border border-dashed border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none h-16 text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed p-3 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Synopsis</label>
                <textarea
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="A brief overview of the story, characters, and themes…"
                  className="w-full bg-transparent border border-dashed border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none h-32 text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed p-3 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Info Bottom Left */}
        <div className="absolute bottom-16 left-16 w-64">
          <textarea
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={"Contact Information\nPhone\nEmail"}
            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none h-32 text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed"
          />
        </div>

        {/* Page Break Indicator */}
        <div className="absolute -bottom-8 left-0 right-0 border-t border-dashed border-zinc-300 dark:border-zinc-700 print:hidden flex justify-center">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600 bg-[#f4f5f7] dark:bg-[#0a0a0a] px-2 -mt-[7px]">PAGE BREAK</span>
        </div>
      </div>
    </div>
  );
}
