import { Prisma, ViewMatchMode, ViewType } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  ensureAllListsView,
  ensureDefaultView,
  recomputeCustomView,
  setSelectedView,
} from "./viewHelpers";

const viewTagIdsInput = z.array(z.uuid()).min(1, {
  message: "Custom views must require at least one tag.",
});

function isPrismaKnownError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export const viewRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx: { userId } }) => {
    await ensureDefaultView(userId);

    return await db.view.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: {
        viewTags: {
          include: {
            tag: true,
          },
        },
        viewLists: {
          select: {
            listId: true,
            order: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  }),

  getViewListsWithItems: protectedProcedure
    .input(z.object({ viewId: z.uuid() }))
    .query(async ({ ctx: { userId }, input: { viewId } }) => {
      const view = await db.view.findFirst({
        where: {
          id: viewId,
          userId,
        },
        include: {
          viewTags: {
            include: { tag: true },
          },
          viewLists: {
            select: { listId: true, order: true },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!view) throw new TRPCError({ code: "NOT_FOUND" });

      const viewLists = await db.viewList.findMany({
        where: {
          viewId,
          list: { userId },
        },
        orderBy: { order: "asc" },
        include: {
          list: {
            include: {
              listTags: { include: { tag: true } },
              listItems: { orderBy: { order: "asc" } },
            },
          },
        },
      });

      return {
        view,
        lists: viewLists.map((vl) => ({
          ...vl.list,
          order: vl.order,
        })),
      };
    }),

  getCurrentViewListsWithItems: protectedProcedure.query(
    async ({ ctx: { userId } }) => {

      const selectedDefaultView = await ensureDefaultView(userId);

      if (!selectedDefaultView) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const selectedView = await db.view.findUniqueOrThrow({
        where: { id: selectedDefaultView.id },
        include: {
          viewTags: {
            include: {
              tag: true,
            },
          },
          viewLists: {
            select: {
              listId: true,
              order: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      const viewLists = await db.viewList.findMany({
        where: {
          viewId: selectedView.id,
          list: { userId },
        },
        orderBy: { order: "asc" },
        include: {
          list: {
            include: {
              listTags: {
                include: {
                  tag: true,
                },
              },
              listItems: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      });

      return {
        view: selectedView,
        lists: viewLists.map((viewList) => ({
          ...viewList.list,
          order: viewList.order,
        })),
      };
    }
  ),

  saveSelectedView: protectedProcedure
    .input(z.object({ viewId: z.uuid() }))
    .mutation(async ({ ctx: { userId }, input: { viewId } }) => {
      const selectedView = await setSelectedView(userId, viewId);

      if (!selectedView) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return selectedView;
    }),

  create: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().trim().min(1).max(255),
        tagIds: viewTagIdsInput,
      })
    )
    .mutation(async ({ ctx: { userId }, input }) => {
      try {
        await ensureAllListsView(userId);
        const view = await db.$transaction(async (tx) => {
          const uniqueTagIds = [...new Set(input.tagIds)];
          const ownedTags = await tx.tag.findMany({
            where: {
              id: { in: uniqueTagIds },
              userId,
            },
            select: { id: true },
          });

          if (ownedTags.length !== uniqueTagIds.length) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }

          const topView = await tx.view.findFirst({
            where: { userId },
            orderBy: { order: "asc" },
            select: { order: true },
          });

          await tx.view.updateMany({
            where: { userId },
            data: { isDefault: false },
          });

          return await tx.view.create({
            data: {
              id: input.id,
              name: input.name,
              userId,
              order: topView ? topView.order - 1 : 0,
              type: ViewType.CUSTOM,
              matchMode: ViewMatchMode.ALL,
              isDefault: true,
              viewTags: {
                createMany: {
                  data: uniqueTagIds.map((tagId) => ({ tagId })),
                  skipDuplicates: true,
                },
              },
            },
            select: { id: true },
          });
        });

        // Keep recompute outside the interactive transaction to avoid the
        // default Prisma transaction timeout on large production accounts.
        await recomputeCustomView(userId, view.id);

        return await db.view.findFirstOrThrow({
          where: {
            id: view.id,
            userId,
          },
          include: {
            viewTags: {
              include: {
                tag: true,
              },
            },
            viewLists: {
              select: {
                listId: true,
                order: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        });
      } catch (error) {
        if (
          isPrismaKnownError(error) &&
          error.code === "P2002" &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes("userId") &&
          error.meta.target.includes("name")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A view with this name already exists.",
            cause: error,
          });
        }

        if (!(error instanceof TRPCError)) {
          console.error("view.create failed", {
            error,
            prismaCode: isPrismaKnownError(error) ? error.code : undefined,
            viewName: input.name,
            tagCount: input.tagIds.length,
            userId,
          });
        }

        throw error;
      }
    }),

  rename: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().trim().min(1).max(255),
      })
    )
    .mutation(async ({ ctx: { userId }, input: { id, name } }) => {
      const renamedViews = await db.view.updateManyAndReturn({
        where: {
          id,
          userId,
          type: ViewType.CUSTOM,
        },
        data: { name },
      });

      if (renamedViews.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return renamedViews[0];
    }),

  updateFilter: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        tagIds: viewTagIdsInput,
      })
    )
    .mutation(async ({ ctx: { userId }, input: { id, tagIds } }) => {
      return await db.$transaction(async (tx) => {
        const uniqueTagIds = [...new Set(tagIds)];
        const ownedTags = await tx.tag.findMany({
          where: {
            id: { in: uniqueTagIds },
            userId,
          },
          select: { id: true },
        });

        if (ownedTags.length !== uniqueTagIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const view = await tx.view.findFirst({
          where: {
            id,
            userId,
            type: ViewType.CUSTOM,
          },
          select: { id: true },
        });

        if (!view) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await tx.view.update({
          where: { id },
          data: { matchMode: ViewMatchMode.ALL },
        });
        await tx.viewTag.deleteMany({
          where: { viewId: id },
        });
        if (uniqueTagIds.length > 0) {
          await tx.viewTag.createMany({
            data: uniqueTagIds.map((tagId) => ({
              viewId: id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }

        await recomputeCustomView(userId, id, tx);

        return await tx.view.findUniqueOrThrow({
          where: { id },
          include: {
            viewTags: {
              include: {
                tag: true,
              },
            },
            viewLists: {
              select: {
                listId: true,
                order: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        });
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx: { userId }, input: { id } }) => {
      return await db.$transaction(async (tx) => {
        const view = await tx.view.findFirst({
          where: {
            id,
            userId,
            type: ViewType.CUSTOM,
          },
        });

        if (!view) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await tx.view.delete({ where: { id } });

        if (view.isDefault) {
          const allListsView = await ensureAllListsView(userId, tx);
          await setSelectedView(userId, allListsView.id, tx);
        }

        return { deleted: true };
      });
    }),

  reorderViews: protectedProcedure
    .input(
      z.object({
        views: z.array(
          z.object({
            id: z.uuid(),
            order: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx: { userId }, input: { views } }) => {
      if (views.length === 0) {
        return { success: true };
      }

      const viewIds = views.map((view) => view.id);
      const ownedViews = await db.view.findMany({
        where: {
          id: { in: viewIds },
          userId,
          type: ViewType.CUSTOM,
        },
        select: { id: true },
      });

      if (ownedViews.length !== viewIds.length) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Save the whole order in one statement. Many small updates were timing out.
      await db.$executeRaw`
        UPDATE "View" AS view
        SET "order" = data."order"
        FROM (VALUES ${Prisma.join(
        views.map((view) => Prisma.sql`(${view.id}::uuid, ${view.order}::int)`)
      )}) AS data("id", "order")
        WHERE view."id" = data."id"
          AND view."userId" = ${userId}::uuid
          AND view."type" = 'CUSTOM'
      `;

      return { success: true };
    }),

  reorderViewLists: protectedProcedure
    .input(
      z.object({
        viewId: z.uuid(),
        lists: z.array(
          z.object({
            id: z.uuid(),
            order: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx: { userId }, input: { viewId, lists } }) => {
      if (lists.length === 0) {
        return { success: true };
      }

      const view = await db.view.findFirst({
        where: {
          id: viewId,
          userId,
        },
        select: { id: true },
      });

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const listIds = lists.map((list) => list.id);
      const ownedViewLists = await db.viewList.findMany({
        where: {
          viewId,
          listId: { in: listIds },
          list: { userId },
        },
        select: { listId: true },
      });

      if (ownedViewLists.length !== listIds.length) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Save the whole order in one statement. Many small updates were timing out.
      await db.$executeRaw`
        UPDATE "ViewList" AS view_list
        SET "order" = data."order"
        FROM (VALUES ${Prisma.join(
        lists.map((list) => Prisma.sql`(${viewId}::uuid, ${list.id}::uuid, ${list.order}::int)`)
      )}) AS data("viewId", "listId", "order")
        WHERE view_list."viewId" = data."viewId"
          AND view_list."listId" = data."listId"
      `;

      return { success: true };
    }),
});
