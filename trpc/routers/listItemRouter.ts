import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";

/**
 * listItemRouter
 * 
 * Handles all operations related to list items.
 * Scope:
 * - CRUD (create, read, update, delete)
 * - Completion state
 * - Ordering (drag & drop)
 * 
 * NOTE:
 * - All procedures are protected (user must be authenticated)
 * - Ownership checks are enforced where needed
 */
export const listItemRouter = createTRPCRouter({

  /**
   * getListItems (deprecated)
   * 
   * Fetch all items for given list.
   * 
   * Used for:
   * - Rendering list contents
   * - Hydrating UI state
   * 
   * Returns items ordered by `order` ascending.
   */
  getListItems: protectedProcedure.input(z.object({
    listId: z.uuid()
  })).query(async ({ input: { listId } }) => {
    const listItems = await db.listItem.findMany({
      where: {
        listId
      },
      orderBy: {
        order: 'asc'
      }
    })

    return listItems
  }),

  /**
   * createListItem
   * 
   * Creates a new list item inside a list.
   * 
   * Behavior:
   * - Verifies the list belongs to the current user
   * - Inserts items at the top (order = lowest)
   * - Defaults to `completed = false`
   * 
   * Optimized for:
   * - Instant UI insertion (top-first UX)
   */
  createListItem: protectedProcedure.input(z.object({
    id: z.uuid(),
    name: z.string().trim().max(255),
    listId: z.uuid(),
  })).mutation(async ({ ctx, input }) => {
    const parentList = await db.list.findFirst({
      where: {
        id: input.listId,
        userId: ctx.userId,
      },
      select: { id: true },
    });

    if (!parentList) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "List does not belong to this user.",
      });
    }

    const topItem = await db.listItem.findFirst({
      where: { listId: input.listId },
      orderBy: { order: "asc" },
      select: { order: true },
    });

    return await db.listItem.create({
      data: {
        id: input.id,
        name: input.name,
        listId: input.listId,
        order: topItem ? topItem.order - 1 : 0,
        completed: false,
      },
    });
  }),

  /**
   * renameListItem
   * 
   * Updates the name of a list item.
   * 
   * Used for:
   * - Inline editing
   */
  renameListItem: protectedProcedure.input(z.object({
    name: z.string().trim().max(255),
    id: z.uuid()
  })).mutation(async ({ input: { id, name } }) => {
    const renamedListItem = await db.listItem.update({
      where: {
        id
      },
      data: {
        name
      }
    })

    if (!renamedListItem) {
      throw new TRPCError({ code: "NOT_FOUND" })
    }

    return renamedListItem
  }),

  /**
   * 
   */
  deleteListItem: protectedProcedure.input(z.object({
    id: z.uuid()
  })).mutation(async ({ input: { id } }) => {
    const result = await db.listItem.deleteMany({
      where: { id },
    });

    return {
      deleted: result.count > 0,
    };
  }),
  setCompletionListItem: protectedProcedure.input(z.object({
    id: z.uuid(),
    completed: z.boolean()
  })).mutation(async ({ input: { id, completed } }) => {
    const listItem = await db.listItem.update({
      where: {
        id
      },
      data: {
        completed
      }
    })

    return listItem
  }),
  reorderListItems: protectedProcedure.input(z.object({
    items: z.array(
      z.object({
        id: z.uuid(),
        listId: z.uuid(),
        order: z.number().int().min(0)
      })
    )
  })).mutation(async ({ ctx: { userId }, input }) => {
    const itemIds = input.items.map((item) => item.id)

    const ownedItems = await db.listItem.findMany({
      where: {
        id: { in: itemIds },
        parentList: {
          userId,
        },
      },
      select: { id: true },
    });

    if (ownedItems.length !== itemIds.length) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Some items do not belong to this user.",
      });
    }

    await db.$transaction(
      input.items.map((item) =>
        db.listItem.update({
          where: { id: item.id },
          data: {
            listId: item.listId,
            order: item.order,
          },
        })
      )
    );

    return { success: true };
  })
})