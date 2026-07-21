"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 h-full">
      {children}
    </div>
  );
}
