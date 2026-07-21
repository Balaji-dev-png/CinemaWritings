"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

/**
 * CopyrightFooter — Rendered globally on every page via the root layout.
 *
 * When a user is logged in, shows their name from Supabase user_metadata.full_name
 * (set during signup). Falls back to "CinemaWritings" when not authenticated.
 */
export function CopyrightFooter() {
  const year = new Date().getFullYear();
  const [authorName, setAuthorName] = useState<string | null>(null);

  useEffect(() => {
    // Read user_metadata on mount and whenever auth state changes
    const resolve = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name =
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          null;
        setAuthorName(name);
      } else {
        setAuthorName(null);
      }
    };

    resolve();

    // Keep in sync with login / logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      resolve();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only render once we know whether the user is logged in or not,
  // so the name never flickers from "CinemaWritings" → real name on load.
  if (authorName === null) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.footer
        aria-label="Site copyright"
        whileHover={{ 
          scale: 1.05,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.2) inset",
          y: -4
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{
          pointerEvents: "auto",
          padding: "8px 24px",
          borderRadius: "999px",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          cursor: "text",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.p
          whileHover={{
            color: "rgba(255,255,255,0.9)",
            textShadow: "0px 0px 12px rgba(255,255,255,0.6)"
          }}
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.45)",
            margin: 0,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          © {year}&nbsp;{authorName}
        </motion.p>
      </motion.footer>
    </div>
  );
}
