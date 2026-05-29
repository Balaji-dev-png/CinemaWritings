"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    <footer
      aria-label="Site copyright"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: "none",
        userSelect: "none",
        padding: "6px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.38)",
          margin: 0,
          lineHeight: 1,
          textTransform: "uppercase",
        }}
      >
        © {year}&nbsp;{authorName}
      </p>
    </footer>
  );
}
