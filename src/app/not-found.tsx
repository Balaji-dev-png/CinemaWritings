"use client";

import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#1E293B] rounded-2xl p-12 shadow-2xl border border-white/10 text-center font-mono">
        <p className="text-slate-500 mb-8 uppercase tracking-widest text-sm">Fade In:</p>
        
        <h1 className="text-6xl font-bold text-white mb-6 uppercase tracking-widest">
          Error 404
        </h1>
        
        <p className="text-xl text-slate-300 mb-12 uppercase tracking-wide">
          The Scene You Are Looking For Does Not Exist.
        </p>
        
        <p className="text-slate-500 mb-12 uppercase tracking-widest text-sm">Cut To:</p>
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-3 bg-white text-[#0F172A] hover:bg-slate-200 font-bold py-4 px-8 rounded-full transition-colors uppercase tracking-wider text-sm"
        >
          <MoveLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
