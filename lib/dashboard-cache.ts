import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { RouterOutputs } from "@/lib/trpc";

export type ViewsCache = RouterOutputs["view"]["getAll"];
export type ViewCacheItem = ViewsCache[number];
export type CurrentViewSnapshot = RouterOutputs["view"]["getCurrentViewListsWithItems"];
export type DashboardSnapshot = CurrentViewSnapshot
export type DashboardList = DashboardSnapshot["lists"][number];
export type DashboardTag = RouterOutputs["tag"]["getAll"][number];
export type SavedListTags = DashboardList["listTags"];
export type AffectedTagView =
  RouterOutputs["tag"]["applyListTagChanges"]["affectedViews"][number] |
  RouterOutputs["tag"]["delete"]["affectedViews"][number];

export type DashboardKeys = {
  views: QueryKey;
  allLists: QueryKey;
  currentView: QueryKey;
  selectedView: QueryKey;
};

export function queryKeysEqual(left: QueryKey, right: QueryKey) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function setDashboardQueryDataOnce<T>(
  queryClient: QueryClient,
  updatedKeys: Set<string>,
  queryKey: QueryKey,
  updater: (snapshot: T | undefined) => T | undefined
) {
  const keyHash = JSON.stringify(queryKey);

  if (updatedKeys.has(keyHash)) return;

  updatedKeys.add(keyHash);
  queryClient.setQueryData<T>(queryKey, updater);
}

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

export function updateListInDashboardCaches(
  queryClient: QueryClient,
  keys: DashboardKeys,
  listId: string,
  updater: (list: DashboardList) => DashboardList
) {
  const updatedKeys = new Set<string>();
  let updatedAllListsSnapshot: DashboardSnapshot | undefined;

  setDashboardQueryDataOnce<DashboardSnapshot>(queryClient, updatedKeys, keys.allLists, (snapshot) => {
    if (!snapshot) return snapshot;

    updatedAllListsSnapshot = {
      ...snapshot,
      lists: snapshot.lists.map((list) =>
        list.id === listId ? updater(list) : list
      ),
    };

    return updatedAllListsSnapshot;
  });

  setDashboardQueryDataOnce<DashboardSnapshot>(queryClient, updatedKeys, keys.currentView, (snapshot) => {
    if (!snapshot) return snapshot;

    if (updatedAllListsSnapshot) {
      return projectView(snapshot.view, updatedAllListsSnapshot);
    }

    return updateListInViewSnapshot(snapshot, listId, updater);
  });

  setDashboardQueryDataOnce<DashboardSnapshot>(queryClient, updatedKeys, keys.selectedView, (snapshot) => {
    if (!snapshot) return snapshot;

    if (updatedAllListsSnapshot) {
      return projectView(snapshot.view, updatedAllListsSnapshot);
    }

    return updateListInViewSnapshot(snapshot, listId, updater);
  });
}

function updateListInViewSnapshot(
  snapshot: DashboardSnapshot,
  listId: string,
  updater: (list: DashboardList) => DashboardList
) {
  const selectedView = snapshot.view;
  const updatedLists = snapshot.lists.map((list) =>
    list.id === listId ? updater(list) : list
  );

  if (selectedView.type !== "CUSTOM") {
    return {
      ...snapshot,
      lists: updatedLists,
    };
  }

  return {
    ...snapshot,
    lists: updatedLists.filter((list) => listMatchesView(list, selectedView)),
  };
}

export function removeListFromDashboardCaches(
  queryClient: QueryClient,
  keys: DashboardKeys,
  listId: string
) {
  const updatedKeys = new Set<string>();
  const removeList = (snapshot: DashboardSnapshot | undefined) =>
    snapshot
      ? {
        ...snapshot,
        lists: snapshot.lists.filter((list) => list.id !== listId),
      }
      : snapshot;

  setDashboardQueryDataOnce<DashboardSnapshot>(queryClient, updatedKeys, keys.allLists, removeList);
  setDashboardQueryDataOnce<DashboardSnapshot>(queryClient, updatedKeys, keys.currentView, removeList);
  setDashboardQueryDataOnce<DashboardSnapshot>(queryClient, updatedKeys, keys.selectedView, removeList);
}

export function invalidateViewPayloadQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      JSON.stringify(query.queryKey).includes("getViewListsWithItems"),
  });
}

export function applyTagChangeToCaches(
  queryClient: QueryClient,
  keys: DashboardKeys,
  listId: string,
  tag: DashboardTag,
  action: "add" | "remove"
) {
  updateListInDashboardCaches(queryClient, keys, listId, (list) => {
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
  });
}

export function reconcileSavedListTags(
  queryClient: QueryClient,
  keys: DashboardKeys,
  listId: string,
  listTags: SavedListTags
) {
  const savedTagById = new Map(
    listTags.map((listTag) => [listTag.tagId, listTag])
  );

  updateListInDashboardCaches(queryClient, keys, listId, (list) => ({
    ...list,
    listTags: [
      ...list.listTags
        .filter((listTag) => savedTagById.has(listTag.tagId))
        .map((listTag) => savedTagById.get(listTag.tagId)!),
      ...listTags.filter((listTag) =>
        !list.listTags.some((currentListTag) =>
          currentListTag.tagId === listTag.tagId
        )
      ),
    ],
  }));
}

export function reconcileAffectedViewLists(
  queryClient: QueryClient,
  keys: DashboardKeys,
  affectedViews: AffectedTagView[]
) {
  if (affectedViews.length === 0) return;

  const affectedViewById = new Map(
    affectedViews.map((view) => [view.id, view])
  );

  queryClient.setQueryData<ViewsCache>(keys.views, (views) =>
    views?.map((view) => {
      const affectedView = affectedViewById.get(view.id);

      return affectedView ? { ...view, ...affectedView } : view;
    })
  );

  const allListsSnapshot = getAllListsSnapshot(queryClient, keys.allLists);
  if (!allListsSnapshot) return;

  const views = queryClient.getQueryData<ViewsCache>(keys.views);
  const reprojectAffectedView = (snapshot: DashboardSnapshot | undefined) => {
    if (!snapshot) return snapshot;

    const updatedView = affectedViewById.get(snapshot.view.id) ??
      views?.find((view) => view.id === snapshot.view.id) ??
      snapshot.view;

    return projectView(updatedView, allListsSnapshot);
  };

  const updatedKeys = new Set<string>();
  setDashboardQueryDataOnce<DashboardSnapshot>(
    queryClient,
    updatedKeys,
    keys.currentView,
    reprojectAffectedView
  );
  setDashboardQueryDataOnce<DashboardSnapshot>(
    queryClient,
    updatedKeys,
    keys.selectedView,
    reprojectAffectedView
  );
}

export function rollbackScope<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  snapshot: T | undefined
) {
  queryClient.setQueryData(queryKey, snapshot);
}
