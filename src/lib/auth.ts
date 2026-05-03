import { supabase } from "./supabase";

export const setTokens = (access: string, refresh: string) => {
  // Supabase handles tokens automatically in cookies/localStorage
};

export const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

export const clearTokens = async () => {
  await supabase.auth.signOut();
};

export const isAuthenticated = async () => {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

export const logout = async () => {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};
