import { createTRPCRouter, protectedProcedure } from "../init"

/**
 * userRouter
 * 
 * Handles user-related queries.
 * Keep this focused on identity, profile, and session data.
 */
export const userRouter = createTRPCRouter({
  /**
   * getUser
   * 
   * Returns the current authenticated user.
   * Useful for:
   * - Navbar (avatar, name)
   * - Guards
   * - Intial app hydration
   */
  getUser: protectedProcedure.query(({ ctx }) => {
    return ctx.user
  }),
  /**
   * getUserId
   * 
   * Lightweight alternative if you only need the ID.
   * Avoids sending the full user object to the client.
   */
  getUserId: protectedProcedure.query(({ ctx }) => {
    return ctx.userId
  }),
})