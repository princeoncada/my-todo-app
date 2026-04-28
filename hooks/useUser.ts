"use client"

import { createClient } from "@/lib/supabase/client"
import { useQuery } from "@tanstack/react-query";

/**
 * useUser provides a single client-side way to access the current Supabase user.
 * 
 * Implementation:
 * - TanStack Query wrapper around supabase.auth.getUser()
 * - Synced by AuthSync through the ["user"] cache key
 * 
 * Why this exists:
 * - Avoids repeated manual Supabase user fetching in components.
 * - Gives components a consistent auth state shape.
 * - Allows user-aware query keys such as ["lists", user.id].
 */

const supabase = createClient();

export function useUser() {
  const query = useQuery({
    queryKey: ["user"],

    /**
     * Fetch the authenticated user from Supabase.
     * 
     * This is used for the initial load. After that, AuthSync keeps
     * this query cache updated when auth state changes.
     */
    queryFn: async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      return user;
    },

    /**
     * The authenticated user does not need frequent refetching.
     * 
     * AuthSync handles changes caused by login/logout events/
     */
    staleTime: Infinity,

    /**
     * Do not retry auth user lookup.
     * 
     * If there is no user, retrying will not magically create one.
     */
    retry: false
  })

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data
  }
}