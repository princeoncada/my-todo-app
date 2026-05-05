"use client";

import {
  projectView,
  selectedViewFromCache,
  syncProjectedCurrentView,
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
import { useCallback, useMemo, useRef, useState } from 'react';
import ListComponent from './ListComponent';
import ListItemComponent from './ListItemComponent';
import ListSkeleton from './ListSkeleton';
import { CurrentView, List, ListItem, Lists, OptimisticList, OptimisticListItem } from './types';
import ListEmpty from './ListEmpty';

type DragPreviewLists = Lists;

function isStillOptimistic(value: unknown) {
  return Boolean(
    value &&
    typeof value === "object" &&
    "isOptimistic" in value &&
    value.isOptimistic
  );
}

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
  const queryKey = currentViewQueryKey;
  const optimisticSync = useOptimisticSync();
  const dashboardKeys = useMemo(() => ({
    views: viewsQueryKey,
    allLists: queryKey,
    currentView: currentViewQueryKey,
  }), [queryKey, currentViewQueryKey, viewsQueryKey]);

  useRenderMeasure("ListsContainer");

  const [activeDropTarget, setActiveDropTarget] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [dragPreviewLists, setDragPreviewLists] = useState<DragPreviewLists | null>(null);
  const dragPreviewListsRef = useRef<DragPreviewLists | null>(null);

  const { data: views, isLoading: viewsLoading, isError: viewsError } = useQuery(
    trpc.view.getAll.queryOptions()
  );
  const { data: allListsSnapshot, isLoading: listsLoading, isError: listsError } = useQuery(
    trpc.view.getCurrentViewListsWithItems.queryOptions()
  );

  const selectedView = selectedViewFromCache(views);
  const currentView = projectView(selectedView, allListsSnapshot);
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
    }

    // This cache is derived from all-lists data, so do not treat it as a second source of truth.
    syncProjectedCurrentView(queryClient, dashboardKeys);

    if (reorderListsTimeoutRef.current) {
      clearTimeout(reorderListsTimeoutRef.current);
    }

    reorderListsTimeoutRef.current = setTimeout(() => {
      optimisticSync.replacePending("list-order", async () => {
        if (!currentView) return;
        const savedLists = nextLists.filter((list) => !isStillOptimistic(list));
        if (savedLists.length === 0) return;

        measureRequest("view.reorderViewLists", { count: nextLists.length });
        await reorderViewListsMutation.mutateAsync({
          viewId: currentView.view.id,
          lists: savedLists.map((list: List, index: number) => ({
            id: list.id,
            order: index
          }))
        });
      }, { label: "view.reorderViewLists" });
    }, 300);
  }, [
    queryKey,
    currentView,
    dashboardKeys,
    optimisticSync,
    queryClient,
    reorderViewListsMutation,
    viewsQueryKey,
  ]);

  const scheduleReorderListItemsSave = useCallback((nextLists: Lists) => {
    measureCacheWrite("items.drop.all-lists", nextLists);
    queryClient.setQueryData<CurrentView>(queryKey, (current) =>
      current
        ? {
          ...current,
          lists: current.lists.map((list) =>
            nextLists.find((nextList) => nextList.id === list.id) ?? list
          ),
        }
        : current
    );

    // This cache is derived from all-lists data, so update it after the main cache changes.
    syncProjectedCurrentView(queryClient, dashboardKeys);

    if (reorderListItemsTimeoutRef.current) {
      clearTimeout(reorderListItemsTimeoutRef.current);
    }

    reorderListItemsTimeoutRef.current = setTimeout(() => {
      optimisticSync.replacePending("item-order", async () => {
        const savedItems = nextLists.flatMap((list: List) =>
          isStillOptimistic(list)
            ? []
            : list.listItems
              .filter((item) => !isStillOptimistic(item))
              .map((item: ListItem, index: number) => ({
                id: item.id,
                listId: list.id,
                order: index
              }))
        );

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
    dashboardKeys,
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

  if (viewsLoading || listsLoading) {
    return <div className="grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </div>;
  }

  if (viewsError || listsError) {
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
