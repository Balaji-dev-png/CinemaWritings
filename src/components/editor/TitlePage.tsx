"use client";

import { useState } from "react";
import { getFontVar } from "@/lib/fonts";

interface TitlePageProps {
  scriptId: string;
  title: string;
  metadata: {
    author: string;
    contact: string;
    logline: string;
    synopsis: string;
    writtenByPrefix: string;
  };
  onTitleChange: (val: string) => void;
  onMetaChange: (meta: any) => void;
  docBgColor?: string;
  docFont?: string;
  docTextColor?: string;
}

export function TitlePage({ 
  scriptId, 
  title, 
  metadata, 
  onTitleChange, 
  onMetaChange, 
  docBgColor, 
  docFont,
  docTextColor
}: TitlePageProps) {
  const [showExtras, setShowExtras] = useState(false);

  return (
    <div className="w-full flex justify-center mb-8 page-break title-page-editor">
      <div
        className="script-page flex flex-col justify-between transition-all duration-300 relative border border-transparent dark:border-[#333] print:border-none"
        style={{
          ...(docBgColor ? { backgroundColor: docBgColor } : {}),
          ...(docFont ? { fontFamily: getFontVar(docFont) } : {}),
          ...(docTextColor ? { color: docTextColor } : {}),
          zIndex: 10
        }}
      >
        {/* Title & Author Center Block */}
        <div className="flex-1 flex flex-col justify-center items-center h-full w-full max-w-2xl mx-auto space-y-4 md:space-y-10 pb-10 md:pb-32 title-page-content">
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onTitleChange(e.currentTarget.textContent || "")}
            className="script-title w-full text-center text-xl md:text-2xl uppercase tracking-widest font-bold bg-transparent border-none focus:outline-none focus:ring-0 underline decoration-1 underline-offset-4"
          >
            {title || "SCRIPT TITLE"}
          </div>
          <div className="title-author-block flex flex-col items-center space-y-2 w-full text-center">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onMetaChange({ writtenByPrefix: e.currentTarget.textContent || "" })}
              className="written-by w-full text-center text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
            >
              {metadata.writtenByPrefix || "written by"}
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onMetaChange({ author: e.currentTarget.textContent || "" })}
              className="author-name w-full text-center bg-transparent border-none focus:outline-none focus:ring-0"
            >
              {metadata.author || "Author Name"}
            </div>
          </div>

          {/* Logline & Synopsis Toggle */}
          <button
            onClick={() => setShowExtras(!showExtras)}
            className="show-logline-btn no-print text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors font-bold"
          >
            {showExtras ? "Hide" : "Show"} Logline & Synopsis
          </button>

          {showExtras && (
            <div className="w-full space-y-6 mt-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Logline</label>
                <textarea
                  value={metadata.logline}
                  onChange={(e) => onMetaChange({ logline: e.target.value })}
                  placeholder="A one or two sentence summary of your story…"
                  className="w-full bg-transparent border border-dashed border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none h-16 text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed p-3 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Synopsis</label>
                <textarea
                  value={metadata.synopsis}
                  onChange={(e) => onMetaChange({ synopsis: e.target.value })}
                  placeholder="A brief overview of the story, characters, and themes…"
                  className="w-full bg-transparent border border-dashed border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none h-32 text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed p-3 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Info Bottom Left */}
        <div className="relative md:absolute md:bottom-16 md:left-16 w-full md:w-64 mt-10 md:mt-0 px-4 md:px-0">
          <textarea
            value={metadata.contact}
            onChange={(e) => onMetaChange({ contact: e.target.value })}
            placeholder={"Contact Information\nPhone\nEmail"}
            className="contact-block w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none h-32 text-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-700 leading-relaxed md:text-left text-center"
          />
        </div>

        {/* Page Break Indicator */}
        <div className="absolute -bottom-8 left-0 right-0 border-t border-dashed border-zinc-300 dark:border-zinc-700 print:hidden flex justify-center page-break-indicator">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600 bg-[#f4f5f7] dark:bg-[#0a0a0a] px-2 -mt-[7px]">PAGE BREAK</span>
        </div>
      </div>
    </div>
  );
}
