"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800" />;
  }

  const isDark = theme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-full bg-white/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md transition-colors flex items-center justify-center relative overflow-hidden"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ y: isDark ? 30 : 0, opacity: isDark ? 0 : 1 }}
        className="absolute"
      >
        <Sun className="w-5 h-5 text-zinc-800" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ y: isDark ? 0 : -30, opacity: isDark ? 1 : 0 }}
      >
        <Moon className="w-5 h-5 text-zinc-100" />
      </motion.div>
    </motion.button>
  );
}
