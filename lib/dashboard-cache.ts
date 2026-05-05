import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { RouterOutputs } from "@/lib/trpc";

export type ViewsCache = RouterOutputs["view"]["getAll"];
export type ViewCacheItem = ViewsCache[number];
export type CurrentViewSnapshot = RouterOutputs["view"]["getCurrentViewListsWithItems"];
export type DashboardSnapshot = CurrentViewSnapshot
export type DashboardList = DashboardSnapshot["lists"][number];
export type DashboardTag = RouterOutputs["tag"]["getAll"][number];

type DashboardKeys = {
  views: QueryKey;
  allLists: QueryKey;
  currentView: QueryKey;
};

export function getAllListsSnapshot(
  queryClient: QueryClient,
  allListsQueryKey: QueryKey
) {
  return queryClient.getQueryData<DashboardSnapshot>(allListsQueryKey);
}

export function listMatchesView(list: DashboardList, view: ViewCacheItem) {
  if (view.type !== "CUSTOM") return true;

  const requiredTagIds = view.viewTags.map((viewTag) => viewTag.tagId);
  if (requiredTagIds.length === 0) return false;

  const listTagIds = new Set(list.listTags.map((listTag) => listTag.tagId));
  return requiredTagIds.every((tagId) => listTagIds.has(tagId));
}

export function projectView(
  view: ViewCacheItem | undefined,
  allListsSnapshot: DashboardSnapshot | undefined
): CurrentViewSnapshot | undefined {
  if (!view || !allListsSnapshot) return undefined;

  if (view.type === "ALL_LISTS") {
    return {
      ...allListsSnapshot,
      view,
    };
  }

  const viewListOrders = new Map(
    view.viewLists.map((viewList) => [viewList.listId, viewList.order])
  );

  return {
    view,
    lists: allListsSnapshot.lists
      .filter((list) => listMatchesView(list, view))
      .map((list) => ({
        ...list,
        order: viewListOrders.get(list.id) ?? list.order,
      }))
      .sort((a, b) => a.order - b.order),
  };
}

export function selectedViewFromCache(views: ViewsCache | undefined) {
  return views?.find((view) => view.isDefault) ??
    views?.find((view) => view.type === "ALL_LISTS");
}

export function applyViewSelectionToViews(
  views: ViewsCache | undefined,
  viewId: string
) {
  return views?.map((view) => ({
    ...view,
    isDefault: view.id === viewId,
  }));
}

export function applyViewSelection(
  queryClient: QueryClient,
  keys: DashboardKeys,
  viewId: string
) {
  queryClient.setQueryData<ViewsCache>(keys.views, (views) =>
    applyViewSelectionToViews(views, viewId)
  );

  const views = queryClient.getQueryData<ViewsCache>(keys.views);
  const selectedView = views?.find((view) => view.id === viewId);
  const allListsSnapshot = getAllListsSnapshot(queryClient, keys.allLists);

  queryClient.setQueryData(keys.currentView, projectView(selectedView, allListsSnapshot));
}

export function syncProjectedCurrentView(
  queryClient: QueryClient,
  keys: DashboardKeys
) {
  const views = queryClient.getQueryData<ViewsCache>(keys.views);
  const selectedView = selectedViewFromCache(views);
  const allListsSnapshot = getAllListsSnapshot(queryClient, keys.allLists);

  queryClient.setQueryData(keys.currentView, projectView(selectedView, allListsSnapshot));
}

export function applyTagChangeToCaches(
  queryClient: QueryClient,
  keys: DashboardKeys,
  listId: string,
  tag: DashboardTag,
  action: "add" | "remove"
) {
  queryClient.setQueryData<DashboardSnapshot>(keys.allLists, (snapshot) => {
    if (!snapshot) return snapshot;

    return {
      ...snapshot,
      lists: snapshot.lists.map((list) => {
        if (list.id !== listId) return list;

        const hasTag = list.listTags.some((listTag) => listTag.tagId === tag.id);

        if (action === "add" && hasTag) return list;
        if (action === "remove" && !hasTag) return list;

        return {
          ...list,
          listTags: action === "add"
            ? [
              ...list.listTags,
              {
                listId,
                tagId: tag.id,
                tag,
              },
            ]
            : list.listTags.filter((listTag) => listTag.tagId !== tag.id),
        };
      }),
    };
  });

  syncProjectedCurrentView(queryClient, keys);
}

export function rollbackScope<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  snapshot: T | undefined
) {
  queryClient.setQueryData(queryKey, snapshot);
}
