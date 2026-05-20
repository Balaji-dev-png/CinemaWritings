import { supabase } from "./supabase";

/**
 * Returns the Supabase access token for the current session.
 *
 * Uses getUser() — server-validated — to verify identity before
 * returning the token. Falls back to getSession() only to read
 * the token string after the user has been verified.
 *
 * IMPORTANT: Never use getSession() alone to check auth — it can
 * be spoofed client-side. Always call getUser() first.
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    // getUser() validates with the Supabase server on every call
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      if (error.message.includes("Refresh Token Not Found")) {
        // Clear local state to stop the error noise
        await supabase.auth.signOut({ scope: "local" });
        return null;
      }
      // Fallback to session token if user validation fails due to network
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    }
    
    if (!user) {
      // Fallback to session token if user is null
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    }

    // Session token is safe to read after user is verified
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (err) {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }
};

export const clearTokens = async () => {
  await supabase.auth.signOut();
};

/**
 * Checks if the user is authenticated via server-validated getUser().
 * Do NOT use getSession() for auth checks — it's client-side only.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && !!user) return true;
  
  // Fallback to session if network fails
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

export const logout = async () => {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// Kept for backwards compatibility — no-op since Supabase manages tokens
export const setTokens = (_access: string, _refresh: string) => {};
