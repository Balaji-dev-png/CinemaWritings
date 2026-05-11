"use client";

import { useState } from "react";
import { getFontVar } from "@/lib/fonts";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PersonalInfo {
  phone: string;
  email: string;
  address: string;
  website: string;
  agency: string;
}

interface TitlePageProps {
  scriptId: string;
  title: string;
  metadata: {
    author: string;
    contact: string;
    logline: string;
    synopsis: string;
    writtenByPrefix: string;
    personalInfo?: PersonalInfo;
    copyright?: string;
  };
  onTitleChange: (val: string) => void;
  onMetaChange: (meta: any) => void;
  docBgColor?: string;
  docFont?: string;
  docTextColor?: string;
}

const EMPTY_PERSONAL: PersonalInfo = {
  phone: "",
  email: "",
  address: "",
  website: "",
  agency: "",
};

export function TitlePage({
  scriptId,
  title,
  metadata,
  onTitleChange,
  onMetaChange,
  docBgColor,
  docFont,
  docTextColor,
}: TitlePageProps) {
  const [showExtras, setShowExtras] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);

  const pi = metadata.personalInfo ?? EMPTY_PERSONAL;

  const titleBg = "#1a1a1a";
  const titleColor = "#c9a84c";
  const subtitleColor = "#888888";
  const authorColor = "#aaaaaa";

  const hasPersonalInfo = pi.phone || pi.email || pi.address || pi.website || pi.agency;

  const updatePI = (field: keyof PersonalInfo, val: string) => {
    onMetaChange({ personalInfo: { ...pi, [field]: val } });
  };

  return (
    <div className="w-full flex justify-center mb-8 title-page-editor">
      <div
        className="script-page flex flex-col justify-between transition-all duration-300 relative print:border-none"
        data-title-page="true"
        style={{
          backgroundColor: titleBg,
          ...(docFont ? { fontFamily: getFontVar(docFont) } : {}),
          color: authorColor,
          zIndex: 10,
        }}
      >
        {/* ─── Title & Author Center Block ─── */}
        <div className="flex-1 flex flex-col justify-center items-center h-full w-full max-w-2xl mx-auto space-y-4 md:space-y-10 pb-10 md:pb-32 title-page-content">

          {/* Title — always gold on screen */}
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onTitleChange(e.currentTarget.textContent || "")}
            className="script-title w-full text-center text-xl md:text-2xl uppercase tracking-widest font-bold bg-transparent border-none focus:outline-none focus:ring-0 underline decoration-1 underline-offset-4"
            style={{ color: titleColor }}
          >
            {title || "SCRIPT TITLE"}
          </div>

          <div className="title-author-block flex flex-col items-center space-y-2 w-full text-center">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onMetaChange({ writtenByPrefix: e.currentTarget.textContent || "" })}
              className="written-by w-full text-center text-sm bg-transparent border-none focus:outline-none focus:ring-0 hover:bg-white/5 rounded transition-colors"
              style={{ color: subtitleColor }}
            >
              {metadata.writtenByPrefix || "written by"}
            </div>
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onMetaChange({ author: e.currentTarget.textContent || "" })}
              className="author-name w-full text-center bg-transparent border-none focus:outline-none focus:ring-0"
              style={{ color: authorColor }}
            >
              {metadata.author || "Author Name"}
            </div>
          </div>

          {/* ─── Logline & Synopsis toggle (hidden from PDF) ─── */}
          <button
            onClick={() => setShowExtras(!showExtras)}
            data-no-print="true"
            className="show-logline-btn no-print flex items-center gap-1 text-[10px] uppercase tracking-widest hover:text-zinc-300 transition-colors font-bold"
            style={{ color: subtitleColor }}
          >
            {showExtras ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showExtras ? "Hide" : "Show"} Logline &amp; Synopsis
          </button>

          {showExtras && (
            <div className="w-full space-y-6 mt-4" data-no-print="true">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: subtitleColor }}>
                  Logline
                </label>
                <textarea
                  value={metadata.logline}
                  onChange={(e) => onMetaChange({ logline: e.target.value })}
                  placeholder="A one or two sentence summary of your story…"
                  className="w-full bg-transparent border border-dashed border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none h-16 text-sm placeholder:text-zinc-700 leading-relaxed p-3 rounded-lg"
                  style={{ color: authorColor }}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: subtitleColor }}>
                  Synopsis
                </label>
                <textarea
                  value={metadata.synopsis}
                  onChange={(e) => onMetaChange({ synopsis: e.target.value })}
                  placeholder="A brief overview of the story, characters, and themes…"
                  className="w-full bg-transparent border border-dashed border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none h-32 text-sm placeholder:text-zinc-700 leading-relaxed p-3 rounded-lg"
                  style={{ color: authorColor }}
                />
              </div>
            </div>
          )}

          {/* ─── Personal Information toggle (hidden from PDF) ─── */}
          <button
            onClick={() => setShowPersonal(!showPersonal)}
            data-no-print="true"
            className="no-print flex items-center gap-1 text-[10px] uppercase tracking-widest hover:text-zinc-300 transition-colors font-bold"
            style={{ color: subtitleColor }}
          >
            {showPersonal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showPersonal ? "Hide" : "Edit"} Personal Information
          </button>

          {showPersonal && (
            <div className="mt-4 space-y-3 w-full" data-no-print="true">
              {[
                { key: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
                { key: "email", label: "Email", placeholder: "your@email.com" },
                { key: "address", label: "Address", placeholder: "City, State ZIP" },
                { key: "website", label: "Website", placeholder: "yourwebsite.com" },
                { key: "agency", label: "Agency / Manager", placeholder: "Agency or Rep name" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: subtitleColor }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    value={(pi as any)[key]}
                    onChange={(e) => updatePI(key as keyof PersonalInfo, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border border-dashed border-zinc-700 focus:border-zinc-500 focus:outline-none text-sm placeholder:text-zinc-700 leading-relaxed px-3 py-2 rounded-lg"
                    style={{ color: authorColor }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Bottom row: Personal info (left) + Copyright (right) ─── */}
        <div
          className="absolute flex items-end justify-between w-full px-0"
          style={{ bottom: "0.7in", left: 0, paddingLeft: "1.5in", paddingRight: "1in" }}
        >
          {/* Personal info block — always rendered so html2canvas picks it up */}
          <div
            className="personal-info-block"
            data-pdf-personal="true"
            style={{ fontSize: "9pt", lineHeight: "1.8", textAlign: "left" }}
          >
            {hasPersonalInfo ? (
              <>
                {pi.agency && <div style={{ fontWeight: "bold" }}>{pi.agency}</div>}
                {pi.phone && <div>{pi.phone}</div>}
                {pi.email && <div>{pi.email}</div>}
                {pi.address && <div>{pi.address}</div>}
                {pi.website && <div>{pi.website}</div>}
              </>
            ) : metadata.contact ? (
              <div style={{ whiteSpace: "pre-line" }}>{metadata.contact}</div>
            ) : null}
          </div>

          {/* Copyright / date — editable inline, always visible in PDF if filled */}
          <div className="relative group">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onMetaChange({ copyright: e.currentTarget.textContent || "" })}
              className="copyright-block focus:outline-none rounded px-2 py-1 transition-all text-right min-w-[140px] hover:shadow-[0_0_0_1px_#555] focus:shadow-[0_0_0_1px_#666]"
              style={{
                fontSize: "9pt",
                lineHeight: "1.8",
                color: metadata.copyright ? subtitleColor : "#555",
              }}
            >
              {metadata.copyright || `© ${new Date().getFullYear()} ${metadata.author || "Your Name"}`}
            </div>
            <span
              data-no-print="true"
              className="no-print absolute -top-5 right-0 text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ color: "#555" }}
            >
              click to edit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
