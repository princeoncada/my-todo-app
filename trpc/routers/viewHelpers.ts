import { Prisma, ViewMatchMode, ViewType } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

type ViewDb = typeof db | Prisma.TransactionClient;

const ALL_LISTS_NAME = "All Lists";

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

  await client.viewList.deleteMany({
    where: { viewId },
  });

  if (tagIds.length === 0) return;

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
    where: {
      userId,
      AND: tagIds.map((tagId) => ({
        listTags: {
          some: { tagId },
        },
      })),
    },
    select: {
      id: true
    },
  });

  if (matchingLists.length === 0) return;

  await client.viewList.createMany({
    data: matchingLists.map((list, index) => ({
      viewId,
      listId: list.id,
      order: previousOrders.get(list.id) ?? allListOrders.get(list.id) ?? index,
    })),
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

export async function recomputeCustomViewsForTags(
  userId: string,
  tagIds: string[],
  client: ViewDb = db
) {
  const uniqueTagIds = [...new Set(tagIds)];

  if (uniqueTagIds.length === 0) return;

  const customViews = await client.view.findMany({
    where: {
      userId,
      type: ViewType.CUSTOM,
      viewTags: {
        some: {
          tagId: { in: uniqueTagIds },
        },
      },
    },
    select: {
      id: true,
    },
  });

  for (const view of customViews) {
    await recomputeCustomView(userId, view.id, client);
  }
}
