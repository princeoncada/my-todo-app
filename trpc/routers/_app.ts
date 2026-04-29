import { db } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { baseProcedure, createTRPCRouter, protectedProcedure } from '../init';
import { userRouter } from './userRouter';
import { listRouter } from './listRouter';

export const appRouter = createTRPCRouter({
  hello: baseProcedure.input(
    z.object({
      text: z.string()
    })
  ).query((opts) => {
    return {
      greeting: `hello ${opts.input.text}`
    }
  }),
  user: userRouter,
  list: listRouter,
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
});

// export type definition of API
export type AppRouter = typeof appRouter;