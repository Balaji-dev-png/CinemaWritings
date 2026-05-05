"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PenTool } from "lucide-react"; // Using the app's logo icon

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
  showProgressBar?: boolean;
  progressPercent?: number;
}

export const LoadingOverlay = ({
  isVisible,
  message,
  showProgressBar = false,
  progressPercent = 0,
}: LoadingOverlayProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0d0d]/95 backdrop-blur-sm"
          style={{ pointerEvents: "all" }} // Ensure clicks underneath are blocked
        >
          {showProgressBar && (
            <div className="fixed top-0 left-0 w-full h-[3px] bg-[#1a1a1a]">
              <div
                className="h-full bg-[#c9a84c] transition-all duration-300 ease-in-out"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          )}

          <div className="flex flex-col items-center">
            {/* Clapperboard / Logo spinning slowly */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="mb-8"
            >
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl">
                <PenTool className="w-8 h-8 text-[#c9a84c]" />
              </div>
            </motion.div>

            {/* Cycling message */}
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-[#c9a84c] text-lg font-medium tracking-wide font-sans text-center"
            >
              {message}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
