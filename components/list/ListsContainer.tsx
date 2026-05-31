"use client";

import {
  buildPersistedItemOrderPayload,
  buildPersistedListOrderPayload,
  canApplySelectedViewPayload,
  DashboardSnapshot,
  selectedViewFromCache,
  ViewsCache,
} from '@/lib/dashboard-cache';
import {
  measureCacheWrite,
  measureOptimisticEvent,
  measureRequest,
  OptimisticProfiler,
  useRenderMeasure,
} from '@/lib/optimistic-debug';
import { useOptimisticSync } from '@/hooks/useOptimisticSync';
import { useTRPC } from '@/trpc/client';
import { DragDropProvider } from '@dnd-kit/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import ListComponent from './ListComponent';
import ListItemComponent from './ListItemComponent';
import ListSkeleton from './ListSkeleton';
import { CurrentView, List, Lists, OptimisticList, OptimisticListItem } from './types';
import ListEmpty from './ListEmpty';

type DragPreviewLists = Lists;

function reorderListsForDrag(
  baseLists: Lists,
  sourceListId: string,
  targetListId: string
): DragPreviewLists | null {
  const sourceIndex = baseLists.findIndex((list) => list.id === sourceListId);
  const targetIndex = baseLists.findIndex((list) => list.id === targetListId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return null;
  }

  const nextLists = [...baseLists];
  const [movedList] = nextLists.splice(sourceIndex, 1);
  nextLists.splice(targetIndex, 0, movedList);

  return nextLists.map((list, index) => ({
    ...list,
    order: index,
  }));
}

function reorderItemsForDrag(
  baseLists: Lists,
  draggedItemId: string,
  targetType: string,
  targetId: string
): DragPreviewLists | null {
  const sourceListIndex = baseLists.findIndex((list) =>
    list.listItems.some((item) => item.id === draggedItemId)
  );

  if (sourceListIndex === -1) return null;

  const sourceItemIndex = baseLists[sourceListIndex].listItems.findIndex(
    (item) => item.id === draggedItemId
  );

  if (sourceItemIndex === -1) return null;

  let targetListIndex = -1;
  let targetItemIndex = 0;

  if (targetType === "list-item") {
    const targetItemId = targetId.replace("list-item-", "");

    targetListIndex = baseLists.findIndex((list) =>
      list.listItems.some((item) => item.id === targetItemId)
    );

    if (targetListIndex === -1) return null;

    targetItemIndex = baseLists[targetListIndex].listItems.findIndex(
      (item) => item.id === targetItemId
    );
  }

  if (targetType === "list-drop") {
    const targetListId = targetId.replace("list-drop-", "");

    targetListIndex = baseLists.findIndex((list) => list.id === targetListId);

    if (targetListIndex === -1) return null;

    targetItemIndex = baseLists[targetListIndex].listItems.length;
  }

  if (targetListIndex === -1) return null;

  if (
    sourceListIndex === targetListIndex &&
    sourceItemIndex === targetItemIndex
  ) {
    return null;
  }

  const nextLists = [...baseLists];
  const nextSourceList: List = {
    ...nextLists[sourceListIndex],
    listItems: [...nextLists[sourceListIndex].listItems],
  };
  nextLists[sourceListIndex] = nextSourceList;

  if (sourceListIndex !== targetListIndex) {
    nextLists[targetListIndex] = {
      ...nextLists[targetListIndex],
      listItems: [...nextLists[targetListIndex].listItems],
    };
  }

  const [movedItem] = nextLists[sourceListIndex].listItems.splice(
    sourceItemIndex,
    1
  );

  let insertIndex = targetItemIndex;

  if (sourceListIndex === targetListIndex && sourceItemIndex < targetItemIndex) {
    insertIndex -= 1;
  }

  nextLists[targetListIndex].listItems.splice(insertIndex, 0, {
    ...movedItem,
    listId: nextLists[targetListIndex].id,
  });

  nextLists[sourceListIndex] = {
    ...nextLists[sourceListIndex],
    listItems: nextLists[sourceListIndex].listItems.map((item, index) => ({
      ...item,
      order: index,
    })),
  };

  if (sourceListIndex !== targetListIndex) {
    nextLists[targetListIndex] = {
      ...nextLists[targetListIndex],
      listItems: nextLists[targetListIndex].listItems.map((item, index) => ({
        ...item,
        order: index,
      })),
    };
  }

  return nextLists;
}

const ListsContainer = () => {

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewsQueryKey = trpc.view.getAll.queryKey();
  const currentViewQueryKey = trpc.view.getCurrentViewListsWithItems.queryKey();

  const { data: views, isLoading: viewsLoading, isError: viewsError } = useQuery(
    trpc.view.getAll.queryOptions()
  );

  const allListsView = views?.find((view) => view.type === "ALL_LISTS");
  const selectedView = selectedViewFromCache(views);
  const selectedViewId = selectedView?.id;

  const allListsQueryKey = allListsView
    ? trpc.view.getViewListsWithItems.queryKey({ viewId: allListsView.id })
    : currentViewQueryKey;
  const selectedViewQueryKey = selectedViewId
    ? trpc.view.getViewListsWithItems.queryKey({ viewId: selectedViewId })
    : currentViewQueryKey;

  const dashboardKeys = {
    views: viewsQueryKey,
    allLists: allListsQueryKey,
    currentView: currentViewQueryKey,
    selectedView: selectedViewQueryKey,
  };

  const queryKey = selectedViewQueryKey;


  const optimisticSync = useOptimisticSync();

  useRenderMeasure("ListsContainer");

  const [activeDropTarget, setActiveDropTarget] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [dragPreviewLists, setDragPreviewLists] = useState<DragPreviewLists | null>(null);
  const dragPreviewListsRef = useRef<DragPreviewLists | null>(null);
  const { data: bootCurrentView, isLoading: bootListsLoading, isError: bootListsError } = useQuery(
    trpc.view.getCurrentViewListsWithItems.queryOptions()
  );

  const { isLoading: allListsLoading, isError: allListsError } = useQuery(
    trpc.view.getViewListsWithItems.queryOptions(
      { viewId: allListsView?.id ?? "00000000-0000-0000-0000-000000000000" },
      { enabled: Boolean(allListsView?.id) }
    )
  );

  const { data: selectedViewSnapshot, isLoading: selectedViewLoading, isError: selectedViewError } = useQuery(
    trpc.view.getViewListsWithItems.queryOptions(
      { viewId: selectedViewId ?? "00000000-0000-0000-0000-000000000000" },
      { enabled: Boolean(selectedViewId) }
    )
  );

  useEffect(() => {
    if (!canApplySelectedViewPayload(selectedViewId, bootCurrentView)) return;
    queryClient.setQueryData(currentViewQueryKey, bootCurrentView);
  }, [bootCurrentView, currentViewQueryKey, queryClient, selectedViewId]);

  useEffect(() => {
    if (!canApplySelectedViewPayload(selectedViewId, selectedViewSnapshot)) return;
    queryClient.setQueryData(currentViewQueryKey, selectedViewSnapshot);
  }, [currentViewQueryKey, queryClient, selectedViewId, selectedViewSnapshot]);

  const currentView =
    (canApplySelectedViewPayload(selectedViewId, selectedViewSnapshot)
      ? selectedViewSnapshot
      : undefined) ??
    (canApplySelectedViewPayload(selectedViewId, bootCurrentView)
      ? bootCurrentView
      : undefined);
  const lists = currentView?.lists ?? [];
  const visibleLists = dragPreviewLists ?? lists;

  const reorderViewListsMutation = useMutation(
    trpc.view.reorderViewLists.mutationOptions()
  );

  const reorderListItemsMutation = useMutation(
    trpc.listItem.reorderListItems.mutationOptions()
  );

  const reorderListsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reorderListItemsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleReorderListsSave = useCallback((nextLists: Lists) => {
    if (currentView?.view.type === "ALL_LISTS") {
      measureCacheWrite("lists.drop.all-lists", nextLists);
      queryClient.setQueryData<CurrentView>(queryKey, (current) =>
        current ? { ...current, lists: nextLists } : current
      );
      queryClient.setQueryData<CurrentView>(currentViewQueryKey, (current) =>
        current ? { ...current, lists: nextLists } : current
      );
    } else {
      measureCacheWrite("lists.drop.view-order", nextLists.map((list, index) => ({
        listId: list.id,
        order: index,
      })));
      queryClient.setQueryData<ViewsCache>(viewsQueryKey, (currentViews) =>
        currentViews?.map((view) =>
          view.id === currentView?.view.id
            ? {
              ...view,
              viewLists: nextLists.map((list, index) => ({
                listId: list.id,
                order: index,
              })),
            }
            : view
        )
      );
      queryClient.setQueryData<CurrentView>(queryKey, (current) =>
        current ? { ...current, lists: nextLists } : current
      );
      queryClient.setQueryData<CurrentView>(currentViewQueryKey, (current) =>
        current ? { ...current, lists: nextLists } : current
      );
    }

    if (reorderListsTimeoutRef.current) {
      clearTimeout(reorderListsTimeoutRef.current);
    }

    reorderListsTimeoutRef.current = setTimeout(() => {
      optimisticSync.replacePending("list-order", async () => {
        if (!currentView) return;
        const savedLists = buildPersistedListOrderPayload(nextLists);
        if (savedLists.length === 0) return;

        measureRequest("view.reorderViewLists", { count: savedLists.length });
        await reorderViewListsMutation.mutateAsync({
          viewId: currentView.view.id,
          lists: savedLists
        });
      }, { label: "view.reorderViewLists" });
    }, 300);
  }, [
    queryKey,
    currentViewQueryKey,
    currentView,
    optimisticSync,
    queryClient,
    reorderViewListsMutation,
    viewsQueryKey,
  ]);

  const scheduleReorderListItemsSave = useCallback((nextLists: Lists) => {
    measureCacheWrite("items.drop.all-lists", nextLists);
    const mergeChangedLists = (current: DashboardSnapshot | undefined) =>
      current
        ? {
          ...current,
          lists: current.lists.map((list) =>
            nextLists.find((nextList) => nextList.id === list.id) ?? list
          ),
        }
        : current;

    queryClient.setQueryData<CurrentView>(allListsQueryKey, mergeChangedLists);
    queryClient.setQueryData<CurrentView>(queryKey, mergeChangedLists);
    queryClient.setQueryData<CurrentView>(currentViewQueryKey, mergeChangedLists);

    if (reorderListItemsTimeoutRef.current) {
      clearTimeout(reorderListItemsTimeoutRef.current);
    }

    reorderListItemsTimeoutRef.current = setTimeout(() => {
      optimisticSync.replacePending("item-order", async () => {
        const savedItems = buildPersistedItemOrderPayload(nextLists);

        if (savedItems.length === 0) return;

        measureRequest("listItem.reorderListItems", {
          count: savedItems.length,
        });
        await reorderListItemsMutation.mutateAsync({
          items: savedItems
        });
      }, { label: "listItem.reorderListItems" });
    }, 300);
  }, [
    queryKey,
    allListsQueryKey,
    currentViewQueryKey,
    optimisticSync,
    queryClient,
    reorderListItemsMutation,
  ]);

  const setLocalDragPreview = useCallback((nextLists: DragPreviewLists | null) => {
    dragPreviewListsRef.current = nextLists;
    setDragPreviewLists(nextLists);
  }, [setDragPreviewLists]);

  const applyLocalDragPreview = useCallback((nextLists: DragPreviewLists) => {
    dragPreviewListsRef.current = nextLists;
    setDragPreviewLists(nextLists);
  }, [setDragPreviewLists]);

  const [revealedItemIds, setRevealedItemIds] = useState(() => new Set<string>());
  const [revealedListIds, setRevealedListIds] = useState(() => new Set<string>());

  const revealList = useCallback((listId: string) => {
    setRevealedListIds((currentIds) => new Set(currentIds).add(listId));
  }, []);

  const revealItem = useCallback((itemId: string) => {
    setRevealedItemIds((currentIds) => new Set(currentIds).add(itemId));
  }, []);

  if (viewsLoading || !allListsView || bootListsLoading || allListsLoading || selectedViewLoading) {
    return <div className="grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </div>;
  }


  if (viewsError || bootListsError || allListsError || selectedViewError) {
    return <>Something went wrong...</>;
  }

  if (visibleLists.length === 0) {
    return <div className='w-full h-full'>
      <ListEmpty />
    </div>;
  }

  return (
    <DragDropProvider
      onDragStart={() => {
        // Keep drag order local so hovering does not rewrite the whole cache.
        measureOptimisticEvent("drag.start", { lists: lists.length });
        setLocalDragPreview(lists);
      }}

      onDragEnd={(e) => {
        setActiveDropTarget(null);

        const { source } = e.operation;
        const finalPreview = dragPreviewListsRef.current;

        setLocalDragPreview(null);

        if (e.canceled) {
          // Cancelled drags should leave cache and server data untouched.
          measureOptimisticEvent("drag.cancel");
          return;
        }

        if (!source || !finalPreview) return;

        measureOptimisticEvent("drag.end", {
          sourceType: source.type,
          lists: finalPreview.length,
        });

        // Only save the final dropped order. Older drag positions do not matter.
        switch (source.type) {
          case "list":
            scheduleReorderListsSave(finalPreview);
            break;

          case "list-item":
            scheduleReorderListItemsSave(finalPreview);
            break;

          default:
            break;
        }
      }}

      onDragOver={(event) => {
        const { source, target } = event.operation;

        if (!source || !target) {
          setActiveDropTarget(null);
          return;
        };

        setActiveDropTarget({
          type: String(target.type),
          id: String(target.id),
        });

        measureOptimisticEvent("drag.over", {
          sourceType: source.type,
          targetType: target.type,
        });

        if (source.type === "list" && target.type === "list") {
          const sourceListId = String(source.id).replace("list-", "");
          const targetListId = String(target.id).replace("list-", "");
          const nextLists = reorderListsForDrag(
            dragPreviewListsRef.current ?? lists,
            sourceListId,
            targetListId
          );

          if (nextLists) applyLocalDragPreview(nextLists);
          return;
        }

        if (source.type !== "list-item") return;

        const draggedItemId = String(source.id).replace("list-item-", "");
        const nextLists = reorderItemsForDrag(
          dragPreviewListsRef.current ?? lists,
          draggedItemId,
          String(target.type),
          String(target.id)
        );

        if (nextLists) applyLocalDragPreview(nextLists);
      }}
    >

      <OptimisticProfiler id="dashboard-list-grid">
        <div className="grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {
            visibleLists.map((list: OptimisticList, index) =>
              <ListComponent
                key={list.id}
                listValues={list}
                index={index}
                enqueue={optimisticSync.enqueue}
                activeDropTarget={activeDropTarget}
                dashboardKeys={dashboardKeys}
                shouldRevealOnMount={
                  Boolean(list.isOptimistic) && !revealedListIds.has(list.id)
                }
                onRevealComplete={() => revealList(list.id)}
              >
                {
                  list.listItems?.map((item: OptimisticListItem, index: number) =>
                    <ListItemComponent
                      key={item.id}
                      listItem={item}
                      index={index}
                      enqueue={optimisticSync.enqueue}
                      dashboardKeys={dashboardKeys}
                      shouldRevealOnMount={
                        Boolean(item.isOptimistic) && !revealedItemIds.has(item.id)
                      }
                      onRevealComplete={() => revealItem(item.id)}
                    />)
                }
              </ListComponent>
            )
          }
        </div>
      </OptimisticProfiler>
    </DragDropProvider>
  );
};

export default ListsContainer;
