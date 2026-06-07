import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Variables Supabase manquantes.");
}

const REMEMBER_ME_KEY = "gaptrack_remember_me";

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined" && typeof window.sessionStorage !== "undefined";
}

const authStorage = {
  getItem: (key: string) => {
    if (!canUseBrowserStorage()) return null;
    const remember = window.localStorage.getItem(REMEMBER_ME_KEY) === "true";
    return remember ? window.localStorage.getItem(key) : window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!canUseBrowserStorage()) return;
    const remember = window.localStorage.getItem(REMEMBER_ME_KEY) === "true";

    if (remember) {
      window.localStorage.setItem(key, value);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (!canUseBrowserStorage()) return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setRememberMe(value: boolean) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(REMEMBER_ME_KEY, value ? "true" : "false");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
  },
});
