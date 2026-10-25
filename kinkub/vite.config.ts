import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const pick = (...values: Array<string | undefined>) => values.find((value) => value?.trim());

  // Vercel already stores these public Supabase values under SUPABASE_*.
  // Map only the URL and anon/publishable key; never expose secret/service-role keys.
  const supabaseUrl = pick(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.VITE_SUPABASE_URL,
    env.SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabasePublicKey = pick(
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return {
    plugins: [react()],
    cacheDir: ".vite-cache",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl ?? ""),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabasePublicKey ?? ""),
    },
  };
});
