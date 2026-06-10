"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Before mount, show a button that looks like the real one (no layout shift)
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
        <Sun className="w-4 h-4 text-zinc-800 dark:text-white" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-9 h-9 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-md backdrop-blur-md transition-colors flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500"
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <motion.div
        initial={false}
        animate={{ y: isDark ? 30 : 0, opacity: isDark ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        {/* Sun — visible in light mode */}
        <Sun className="w-4 h-4 text-zinc-800" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ y: isDark ? 0 : -30, opacity: isDark ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        {/* Moon — visible in dark mode */}
        <Moon className="w-4 h-4 text-white" />
      </motion.div>
    </motion.button>
  );
}
