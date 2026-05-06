import z from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "../init";
import { recomputeCustomViewsForTags, recomputeCustomViewsForUser } from "./viewHelpers";

export const tagColorSchema = z.enum([
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
]);

const listTagChangeSchema = z.object({
  tagId: z.uuid(),
  action: z.enum(["add", "remove"]),
});

export const tagRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx: { userId } }) => {
    return await db.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        listTags: true,
      },
    });
  }),
  create: protectedProcedure.input(z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(255),
    color: tagColorSchema.default("gray"),
  })).mutation(async ({ ctx: { userId }, input }) => {
    return await db.tag.create({
      data: {
        id: input.id,
        name: input.name,
        color: input.color,
        userId,
      },
    });
  }),
  update: protectedProcedure.input(z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(255).optional(),
    color: tagColorSchema.optional(),
  })).mutation(async ({ ctx: { userId }, input }) => {
    const updatedTags = await db.tag.updateManyAndReturn({
      where: {
        id: input.id,
        userId,
      },
      data: {
        name: input.name,
        color: input.color,
      },
    });

    if (updatedTags.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return updatedTags[0];
  }),
  delete: protectedProcedure.input(z.object({
    id: z.uuid(),
  })).mutation(async ({ ctx: { userId }, input: { id } }) => {
    const result = await db.$transaction(async (tx) => {
      const result = await tx.tag.deleteMany({
        where: {
          id,
          userId,
        },
      });

      return {
        deleted: result.count > 0,
      };
    });

    await recomputeCustomViewsForUser(userId);

    return result;
  }),
  addToList: protectedProcedure.input(z.object({
    listId: z.uuid(),
    tagId: z.uuid(),
  })).mutation(async ({ ctx: { userId }, input: { listId, tagId } }) => {
    const [list, tag] = await Promise.all([
      db.list.findFirst({
        where: { id: listId, userId },
        select: { id: true },
      }),
      db.tag.findFirst({
        where: { id: tagId, userId },
        select: { id: true },
      }),
    ]);

    if (!list || !tag) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const listTag = await db.$transaction(async (tx) => {
      const listTag = await tx.listTag.upsert({
        where: {
          listId_tagId: {
            listId,
            tagId,
          },
        },
        update: {},
        create: {
          listId,
          tagId,
        },
      });

      return listTag;
    });

    await recomputeCustomViewsForTags(userId, [tagId]);

    return listTag;
  }),
  removeFromList: protectedProcedure.input(z.object({
    listId: z.uuid(),
    tagId: z.uuid(),
  })).mutation(async ({ ctx: { userId }, input: { listId, tagId } }) => {
    const result = await db.$transaction(async (tx) => {
      const result = await tx.listTag.deleteMany({
        where: {
          listId,
          tagId,
          list: {
            userId,
          },
          tag: {
            userId,
          },
        },
      });

      await recomputeCustomViewsForUser(userId, tx);

      return {
        detached: result.count > 0,
      };
    });

    await recomputeCustomViewsForTags(userId, [tagId]);

    return result;
  }),

  applyListTagChanges: protectedProcedure.input(z.object({
    listId: z.uuid(),
    operations: z.array(listTagChangeSchema),
  })).mutation(async ({ ctx: { userId }, input: { listId, operations } }) => {
    const compactedOperations = Array.from(
      operations
        .reduce((map, operation) => {
          map.set(operation.tagId, operation.action);
          return map;
        }, new Map<string, "add" | "remove">())
        .entries()
    ).map(([tagId, action]) => ({ tagId, action }));

    if (compactedOperations.length === 0) {
      const listTags = await db.listTag.findMany({
        where: {
          listId,
          list: { userId },
        },
        include: { tag: true },
      });

      return {
        listId,
        listTags,
        affectedViews: [],
      };
    }

    const tagIds = compactedOperations.map((operation) => operation.tagId);
    const addTagIds = compactedOperations
      .filter((operation) => operation.action === "add")
      .map((operation) => operation.tagId);
    const [list, ownedAddTags] = await Promise.all([
      db.list.findFirst({
        where: { id: listId, userId },
        select: { id: true },
      }),
      db.tag.findMany({
        where: { id: { in: addTagIds }, userId },
        select: { id: true },
      }),
    ]);

    if (!list || ownedAddTags.length !== new Set(addTagIds).size) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    await db.$transaction(async (tx) => {
      const adds = compactedOperations
        .filter((operation) => operation.action === "add")
        .map((operation) => ({
          listId,
          tagId: operation.tagId,
        }));
      const removes = compactedOperations
        .filter((operation) => operation.action === "remove")
        .map((operation) => operation.tagId);

      if (adds.length > 0) {
        await tx.listTag.createMany({
          data: adds,
          skipDuplicates: true,
        });
      }

      if (removes.length > 0) {
        await tx.listTag.deleteMany({
          where: {
            listId,
            tagId: { in: removes },
            list: { userId },
            tag: { userId },
          },
        });
      }
    });

    // Recompute after the short write transaction. Keeping this outside avoids Prisma's 5s transaction timeout.
    await recomputeCustomViewsForTags(userId, tagIds);

    const [listTags, affectedViews] = await Promise.all([
      db.listTag.findMany({
        where: {
          listId,
          list: { userId },
        },
        include: { tag: true },
      }),
      db.view.findMany({
        where: {
          userId,
          type: "CUSTOM",
          viewTags: {
            some: {
              tagId: { in: tagIds },
            },
          },
        },
        include: {
          viewTags: {
            include: { tag: true },
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
      }),
    ]);

    return {
      listId,
      listTags,
      affectedViews,
    };
  }),
})
