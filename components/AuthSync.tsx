"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * AuthSync keeps the client-side React Query cache aligne with Supabase Auth.
 * 
 * Implementation:
 * - Supabase Auth session listener
 * - Tanstack Query cache synchronization
 * 
 * Why this exists:
 * - Supabase own the real auth session.
 * - React Query owns client-side cached server state.
 * - When auth changes, cached data from the previous user must be cleared.
 * 
 * Related behavior:
 * - On login: stores the current Supabase user in the ["user"] query cache.
 * - On logout: clears the full Reach Query cachce to prevent stale user data leaks.
 * 
 * Usage:
 * Mount once inside QueryClientProvider.
 */

const supabase = createClient();

export function AuthSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    /**
     * Subscribe to Supabase auth state changes.
     * 
     * This fires when the user signs in, signs out, refreshes a token,
     * or when a Supabase restores an existing session from storage.
     */
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      /**
       * Store the currently authenticated user in React Query.
       * 
       * This allows the app to use a simple useUser() hook instead of
       * manually calling supabase.auth.getUser() in many components.
       */
      queryClient.setQueryData(["user"], session?.user ?? null);

      /**
       * Clear all cached server state when no active session.
       * 
       * This prevents User B from seeing User A's cached list after logging out.
       */
      if (!session) {
        queryClient.clear();
      }
    });

    /**
     * Clean up the auth listener when this component unmounts.
     * 
     * This prevents duplicate listeners during hot reloads or remounts.
     */
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}