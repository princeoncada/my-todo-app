import { createClient } from '@/lib/supabase/server';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

/**
 * This context creator accepts `headers` so it can be reused in both
 * the RSC server caller (where you pass `next/headers`) and the
 * API route handler (where you pass the request headers).
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
export const createTRPCContext = async (_opts: { headers: Headers }) => {

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return {
    supabase,
    user
  }
};

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    /**
     * @see https://trpc.io/docs/server/data-transformers
     */
    transformer: superjson,
  });

const isAuth = t.middleware((opts) => {
  const user = opts.ctx.user

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  return opts.next({
    ctx: {
      userId: user.id
    }
  })
})

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuth)