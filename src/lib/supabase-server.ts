import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// DEBUG: Log environment variable status
console.log("🔍 SUPABASE CLIENT DEBUG:", {
  timestamp: new Date().toISOString(),
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl?.length || 0,
  urlStart: supabaseUrl?.substring(0, 20) + "...",
  hasAnonKey: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey?.length || 0,
  anonKeyStart: supabaseAnonKey?.substring(0, 20) + "...",
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyLength: supabaseServiceKey?.length || 0,
  serviceKeyStart: supabaseServiceKey?.substring(0, 20) + "...",
  nodeEnv: process.env.NODE_ENV,
  allEnvKeys: Object.keys(process.env).filter((key) =>
    key.includes("SUPABASE")
  ),
});

// Server-side Supabase client for Server Components
export const createServerComponentClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
};

// Server-side Supabase client for API routes
export const createRouteHandlerClient = async () => {
  console.log("🔧 Creating RouteHandler Client with ANON key");
  const cookieStore = await cookies();
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
  console.log("✅ RouteHandler Client created successfully");
  return client;
};

// Service role client for admin operations (bypasses RLS)
export const createServiceRoleClient = () => {
  console.log("🔧 Creating Service Role Client");
  console.log("🔍 Service Key Check:", {
    hasServiceKey: !!supabaseServiceKey,
    serviceKeyLength: supabaseServiceKey?.length || 0,
    serviceKeyStart: supabaseServiceKey?.substring(0, 30) + "...",
  });

  if (!supabaseServiceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not defined");
    throw new Error("Service role key not configured");
  }

  const client = createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get() {
        return undefined;
      },
      set() {},
      remove() {},
    },
  });
  console.log("✅ Service Role Client created successfully");
  return client;
};

// Middleware Supabase client
export const createMiddlewareClient = (request: NextRequest) =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });
