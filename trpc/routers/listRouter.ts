import { db } from "@/lib/db"
import { createTRPCRouter, protectedProcedure } from "../init"
import z from "zod"
import { TRPCError } from "@trpc/server"


export const listRouter = createTRPCRouter({
  getLists: protectedProcedure.query(async ({ ctx: { userId } }) => {
    const lists = await db.list.findMany({
      where: {
        userId
      },
      orderBy: {
        order: 'asc'
      }
    })

    return lists
  }),
  getListsWithItems: protectedProcedure.query(async ({ ctx: { userId } }) => {
    const lists = await db.list.findMany({
      where: {
        userId
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        listItems: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    return lists
  }),
  createList: protectedProcedure.input(
    z.object({
      id: z.uuid(),
      name: z.string().trim().max(255),
    })
  ).mutation(async ({ ctx: { userId }, input }) => {
    const topList = await db.list.findFirst({
      where: { userId },
      orderBy: { order: "asc" },
      select: { order: true },
    });

    return await db.list.create({
      data: {
        id: input.id,
        name: input.name,
        userId,
        order: topList ? topList.order - 1 : 0,
      },
    });
  }),
  renameList: protectedProcedure.input(
    z.object({
      id: z.uuid(),
      name: z.string().trim().max(255)
    })
  ).mutation(async ({ ctx: { userId }, input: { id, name } }) => {
    const renamedList = await db.list.updateManyAndReturn({
      where: {
        id,
        userId
      },
      data: {
        name
      }
    })

    if (renamedList.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND" })
    }

    return renamedList[0]
  }),
  deleteList: protectedProcedure.input(
    z.object({
      listId: z.uuid()
    })
  ).mutation(async ({ input }) => {
    return await db.$transaction(async (tx) => {
      await tx.listItem.deleteMany({
        where: {
          listId: input.listId,
        },
      });

      await tx.list.delete({
        where: {
          id: input.listId,
        },
      });
    });
  }),
  reorderLists: protectedProcedure.input(z.object({
    lists: z.array(
      z.object({
        id: z.uuid(),
        order: z.number().int().min(0)
      })
    )
  })).mutation(async ({ ctx: { userId }, input }) => {
    const ids = input.lists.map((list) => list.id)

    const ownedLists = await db.list.findMany({
      where: {
        id: { in: ids },
        userId
      },
      select: { id: true }
    })

    if (ownedLists.length !== ids.length) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Some lists do not belong to this user."
      })
    }

    await db.$transaction(
      input.lists.map((list) =>
        db.list.update({
          where: { id: list.id },
          data: { order: list.order }
        })
      )
    )

    return { success: true }
  }),
})