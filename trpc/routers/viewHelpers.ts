import { Prisma, ViewMatchMode, ViewType } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

type ViewDb = typeof db | Prisma.TransactionClient;

const ALL_LISTS_NAME = "All Lists";

export const viewProjectionPayloadInclude = {
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
} satisfies Prisma.ViewInclude;

type ListOrderCandidate = {
  id: string;
};

export function listMatchesViewTags(
  listTagIds: string[],
  requiredTagIds: string[],
  matchMode: ViewMatchMode
) {
  if (requiredTagIds.length === 0) return false;

  const listTagIdSet = new Set(listTagIds);

  if (matchMode === ViewMatchMode.ANY) {
    return requiredTagIds.some((tagId) => listTagIdSet.has(tagId));
  }

  return requiredTagIds.every((tagId) => listTagIdSet.has(tagId));
}

export function customViewMembershipWhere(
  userId: string,
  requiredTagIds: string[],
  matchMode: ViewMatchMode
): Prisma.ListWhereInput | null {
  if (requiredTagIds.length === 0) return null;

  if (matchMode === ViewMatchMode.ANY) {
    return {
      userId,
      listTags: {
        some: {
          tagId: { in: requiredTagIds },
        },
      },
    };
  }

  return {
    userId,
    AND: requiredTagIds.map((tagId) => ({
      listTags: {
        some: { tagId },
      },
    })),
  };
}

export function customViewsAffectedByTagsWhere(
  userId: string,
  tagIds: string[]
): Prisma.ViewWhereInput | null {
  const uniqueTagIds = [...new Set(tagIds)];

  if (uniqueTagIds.length === 0) return null;

  return {
    userId,
    type: ViewType.CUSTOM,
    viewTags: {
      some: {
        tagId: { in: uniqueTagIds },
      },
    },
  };
}

export function buildCustomViewListRows({
  viewId,
  matchingLists,
  previousOrders,
  allListOrders,
}: {
  viewId: string;
  matchingLists: ListOrderCandidate[];
  previousOrders: Map<string, number>;
  allListOrders: Map<string, number>;
}) {
  const assignedOrders = matchingLists
    .map((list) => previousOrders.get(list.id) ?? allListOrders.get(list.id))
    .filter((order): order is number => order !== undefined);
  const fallbackStart = assignedOrders.length > 0
    ? Math.max(...assignedOrders) + 1
    : 0;

  let fallbackOffset = 0;

  return matchingLists.map((list) => {
    const knownOrder = previousOrders.get(list.id) ?? allListOrders.get(list.id);

    if (knownOrder !== undefined) {
      return {
        viewId,
        listId: list.id,
        order: knownOrder,
      };
    }

    const order = fallbackStart + fallbackOffset;
    fallbackOffset += 1;

    return {
      viewId,
      listId: list.id,
      order,
    };
  });
}

export async function ensureAllListsView(userId: string, client: ViewDb = db) {
  let allListsView = await client.view.findFirst({
    where: {
      userId,
      type: ViewType.ALL_LISTS,
    },
  });

  const hasDefaultView = await client.view.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    select: {
      id: true,
    },
  });

  if (!allListsView) {
    const topView = await client.view.findFirst({
      where: { userId },
      orderBy: { order: "asc" },
      select: { order: true },
    });

    allListsView = await client.view.create({
      data: {
        name: ALL_LISTS_NAME,
        userId,
        order: topView ? topView.order - 1 : 0,
        type: ViewType.ALL_LISTS,
        matchMode: ViewMatchMode.ALL,
        isDefault: !hasDefaultView,
      },
    });
  }

  await backfillAllListsView(userId, allListsView.id, client);

  return allListsView;
}

export async function ensureDefaultView(userId: string, client: ViewDb = db) {
  const allListsView = await client.view.findFirst({
    where: {
      userId,
      type: ViewType.ALL_LISTS,
    },
  }) ?? await ensureAllListsView(userId, client);
  const defaultView = await client.view.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });

  if (defaultView) {
    return defaultView;
  }

  return await setSelectedView(userId, allListsView.id, client);
}

export async function setSelectedView(
  userId: string,
  viewId: string,
  client: ViewDb = db
) {
  const view = await client.view.findFirst({
    where: {
      id: viewId,
      userId,
    },
  });

  if (!view) return null;
  if (view.isDefault) return view;

  await client.view.updateMany({
    where: {
      userId,
      isDefault: true,
      id: { not: viewId },
    },
    data: { isDefault: false },
  });

  return await client.view.update({
    where: { id: viewId },
    data: { isDefault: true },
  });
}

export async function backfillAllListsView(
  userId: string,
  viewId: string,
  client: ViewDb = db
) {
  const [lists, viewLists] = await Promise.all([
    client.list.findMany({
      where: { userId },
      select: {
        id: true
      },
      orderBy: { createdAt: "asc" }
    }),
    client.viewList.findMany({
      where: { viewId },
      select: { listId: true },
    }),
  ]);

  const existingListIds = new Set(viewLists.map((viewList) => viewList.listId));
  const missingLists = lists.filter((list) => !existingListIds.has(list.id));

  if (missingLists.length === 0) return;

  const bottomViewList = await client.viewList.findFirst({
    where: { viewId },
    orderBy: { order: "desc" },
    select: { order: true }
  })

  const startOrder = bottomViewList ? bottomViewList.order + 1 : 0;

  await client.viewList.createMany({
    data: missingLists.map((list, index) => ({
      viewId,
      listId: list.id,
      order: startOrder + index,
    })),
    skipDuplicates: true,
  });
}

export async function recomputeCustomView(
  userId: string,
  viewId: string,
  client: ViewDb = db
) {
  const view = await client.view.findFirst({
    where: {
      id: viewId,
      userId,
      type: ViewType.CUSTOM,
    },
    include: {
      viewTags: true,
      viewLists: true,
    },
  });

  if (!view) return;

  const tagIds = view.viewTags.map((viewTag) => viewTag.tagId);
  const membershipWhere = customViewMembershipWhere(
    userId,
    tagIds,
    view.matchMode
  );

  await client.viewList.deleteMany({
    where: { viewId },
  });

  if (!membershipWhere) return;

  const allListsView = await ensureAllListsView(userId, client);
  const allViewLists = await client.viewList.findMany({
    where: {
      viewId: allListsView.id,
    },
    select: {
      listId: true,
      order: true,
    },
  });
  const allListOrders = new Map(
    allViewLists.map((viewList) => [viewList.listId, viewList.order])
  );
  const previousOrders = new Map(
    view.viewLists.map((viewList) => [viewList.listId, viewList.order])
  );

  const matchingLists = await client.list.findMany({
    where: membershipWhere,
    select: {
      id: true
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  if (matchingLists.length === 0) return;

  await client.viewList.createMany({
    data: buildCustomViewListRows({
      viewId,
      matchingLists,
      previousOrders,
      allListOrders,
    }),
    skipDuplicates: true,
  });
}

export async function recomputeCustomViewsForUser(
  userId: string,
  client: ViewDb = db
) {
  const customViews = await client.view.findMany({
    where: {
      userId,
      type: ViewType.CUSTOM,
    },
    select: {
      id: true,
    },
  });

  for (const view of customViews) {
    await recomputeCustomView(userId, view.id, client);
  }
}

export async function recomputeCustomViewsForIds(
  userId: string,
  viewIds: string[],
  client: ViewDb = db
) {
  const uniqueViewIds = [...new Set(viewIds)];

  for (const viewId of uniqueViewIds) {
    await recomputeCustomView(userId, viewId, client);
  }
}

export async function recomputeCustomViewsForTags(
  userId: string,
  tagIds: string[],
  client: ViewDb = db
) {
  const where = customViewsAffectedByTagsWhere(userId, tagIds);
  if (!where) return;

  const customViews = await client.view.findMany({
    where,
    select: {
      id: true,
    },
  });

  await recomputeCustomViewsForIds(
    userId,
    customViews.map((view) => view.id),
    client
  );
}

export async function getAffectedCustomViewIdsForTags(
  userId: string,
  tagIds: string[],
  client: ViewDb = db
) {
  const where = customViewsAffectedByTagsWhere(userId, tagIds);
  if (!where) return [];

  const customViews = await client.view.findMany({
    where,
    select: {
      id: true,
    },
  });

  return customViews.map((view) => view.id);
}

export async function getAffectedCustomViewsForTags(
  userId: string,
  tagIds: string[],
  client: ViewDb = db
) {
  const where = customViewsAffectedByTagsWhere(userId, tagIds);
  if (!where) return [];

  return await client.view.findMany({
    where,
    include: viewProjectionPayloadInclude,
  });
}

export async function getAffectedCustomViewsByIds(
  userId: string,
  viewIds: string[],
  client: ViewDb = db
) {
  const uniqueViewIds = [...new Set(viewIds)];
  if (uniqueViewIds.length === 0) return [];

  return await client.view.findMany({
    where: {
      userId,
      type: ViewType.CUSTOM,
      id: { in: uniqueViewIds },
    },
    include: viewProjectionPayloadInclude,
  });
}
