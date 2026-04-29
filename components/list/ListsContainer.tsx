"use client";

import { useMutationQueue } from '@/lib/helper';
import { useTRPC } from '@/trpc/client';
import { DragDropProvider } from '@dnd-kit/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import ListComponent from './ListComponent';
import ListItemComponent from './ListItemComponent';
import ListSkeleton from './ListSkeleton';
import { List, ListItem, Lists, OptimisticList, OptimisticListItem } from './types';
import ListEmpty from './ListEmpty';

const ListsContainer = () => {

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.list.getListsWithItems.queryKey();
  const { enqueue } = useMutationQueue();

  const [activeDropTarget, setActiveDropTarget] = useState<{
    type: string;
    id: string;
  } | null>(null);

  const { data: retrievedLists, isLoading, isError } = useQuery(trpc.list.getListsWithItems.queryOptions(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  }));

  const lists = retrievedLists ?? [];

  const reorderListsMutation = useMutation(
    trpc.list.reorderLists.mutationOptions()
  );

  const reorderListItemsMutation = useMutation(
    trpc.listItem.reorderListItems.mutationOptions()
  );

  const reorderListsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reorderListItemsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestListsPayloadRef = useRef<Lists | null>(null);
  const latestListItemsPayloadRef = useRef<Lists | null>(null);

  const scheduleReorderListsSave = (nextLists: Lists) => {
    // Keep the newest list order
    latestListsPayloadRef.current = nextLists;

    // Update UI instantly through cache
    queryClient.setQueryData<Lists>(queryKey, nextLists);

    // Cancel old timer
    if (reorderListsTimeoutRef.current) {
      clearTimeout(reorderListsTimeoutRef.current);
    }

    reorderListsTimeoutRef.current = setTimeout(() => {
      // Get latest payload at save time
      const latestLists = latestListsPayloadRef.current;

      if (!latestLists) return;

      enqueue(async () => {
        // Server save runs through queue
        await reorderListsMutation.mutateAsync({
          lists: latestLists.map((list: List, index: number) => ({
            id: list.id,
            order: index
          }))
        });
      });
    }, 300);
  };

  const scheduleReorderListItemsSave = (nextLists: Lists) => {
    // Keep the newest list order
    latestListItemsPayloadRef.current = nextLists;

    // Update UI instantly through cache
    queryClient.setQueryData<Lists>(queryKey, nextLists);

    // Cancel old timer
    if (reorderListItemsTimeoutRef.current) {
      clearTimeout(reorderListItemsTimeoutRef.current);
    }

    reorderListItemsTimeoutRef.current = setTimeout(() => {
      // Get latest payload at save time
      const latestLists = latestListItemsPayloadRef.current;

      if (!latestLists) return;

      enqueue(async () => {
        // Server save runs through queue
        await reorderListItemsMutation.mutateAsync({
          items: latestLists.flatMap((list: List) =>
            list.listItems.map((item: ListItem, index: number) => ({
              id: item.id,
              listId: list.id,
              order: index
            }))
          )
        });
      });
    }, 300);
  };

  const revealedItemIdsRef = useRef(new Set<string>());
  const revealedListIdsRef = useRef(new Set<string>());

  if (isLoading) {
    return <div className="grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </div>;
  }

  if (isError) {
    return <>Something went wrong...</>;
  }

  if (lists.length === 0) {
    return <div className='w-full h-full'>
      <ListEmpty />
    </div>;
  }

  return (
    <DragDropProvider
      onDragStart={() => {
        console.log(lists.map((list) => ({ id: list.id, order: list.order })));
      }}

      onDragEnd={(e) => {
        setActiveDropTarget(null);

        const { source } = e.operation;

        if (!source) return;

        // Get the latest optimistic cache after dragging
        const currentLists = queryClient.getQueryData<Lists>(queryKey);

        if (!currentLists) return;

        switch (source.type) {
          case "list":
            // Schedule debounced save for latest list order
            scheduleReorderListsSave(currentLists);
            break;

          case "list-item":
            // Schedule debounced save for latest item order
            scheduleReorderListItemsSave(currentLists);
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


        if (source.type === "list" && target.type === "list") {
          const sourceListId = String(source.id).replace("list-", "");
          const targetListId = String(target.id).replace("list-", "");

          queryClient.setQueryData<Lists>(queryKey, (currentLists) => {
            if (!currentLists) return currentLists;
            const sourceIndex = currentLists.findIndex(
              (list: List) => list.id === sourceListId
            );

            const targetIndex = currentLists.findIndex(
              (list: List) => list.id === targetListId
            );

            if (sourceIndex === -1 || targetIndex === -1) return currentLists;
            if (sourceIndex === targetIndex) return currentLists;

            const nextLists = [...currentLists];
            const [movedList] = nextLists.splice(sourceIndex, 1);
            nextLists.splice(targetIndex, 0, movedList);

            return nextLists.map((list, index) => ({
              ...list,
              order: index,
            }));
          });

          return;
        }

        if (source.type !== "list-item") return;

        const draggedItemId = String(source.id).replace("list-item-", "");

        queryClient.setQueryData<Lists>(queryKey, (currentLists) => {
          if (!currentLists) return currentLists;
          const sourceListIndex = currentLists.findIndex((list: List) =>
            list.listItems.some((item: ListItem) => item.id === draggedItemId)
          );

          if (sourceListIndex === -1) return currentLists;

          const sourceList = currentLists[sourceListIndex];
          const sourceItemIndex = sourceList.listItems.findIndex(
            (item: ListItem) => item.id === draggedItemId
          );

          if (sourceItemIndex === -1) return currentLists;

          let targetListIndex = -1;
          let targetItemIndex = 0;

          if (target.type === "list-item") {
            const targetItemId = String(target.id).replace("list-item-", "");

            targetListIndex = currentLists.findIndex((list: List) =>
              list.listItems.some((item: ListItem) => item.id === targetItemId)
            );

            if (targetListIndex === -1) return currentLists;

            targetItemIndex = currentLists[targetListIndex].listItems.findIndex(
              (item: ListItem) => item.id === targetItemId
            );
          }

          if (target.type === "list-drop") {
            const targetListId = String(target.id).replace("list-drop-", "");

            targetListIndex = currentLists.findIndex(
              (list) => list.id === targetListId
            );

            if (targetListIndex === -1) return currentLists;

            targetItemIndex = currentLists[targetListIndex].listItems.length;
          }

          if (targetListIndex === -1) return currentLists;

          if (
            sourceListIndex === targetListIndex &&
            sourceItemIndex === targetItemIndex
          ) {
            return currentLists;
          }

          const nextLists = currentLists.map((list: List) => ({
            ...list,
            listItems: [...list.listItems],
          }));

          const [movedItem] = nextLists[sourceListIndex].listItems.splice(
            sourceItemIndex,
            1
          );

          let insertIndex = targetItemIndex;

          if (
            sourceListIndex === targetListIndex &&
            sourceItemIndex < targetItemIndex
          ) {
            insertIndex -= 1;
          }

          nextLists[targetListIndex].listItems.splice(insertIndex, 0, {
            ...movedItem,
            listId: nextLists[targetListIndex].id,
          });

          nextLists[sourceListIndex].listItems =
            nextLists[sourceListIndex].listItems.map((item: ListItem, index: number) => ({
              ...item,
              order: index,
            }));

          nextLists[targetListIndex].listItems =
            nextLists[targetListIndex].listItems.map((item: ListItem, index: number) => ({
              ...item,
              order: index,
            }));

          return nextLists;
        });
      }}
    >

      <div className="grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {
          lists.map((list: OptimisticList, index) =>
            <ListComponent
              key={list.id}
              listValues={list}
              index={index}
              enqueue={enqueue}
              activeDropTarget={activeDropTarget}
              shouldRevealOnMount={
                Boolean(list.isOptimistic) && !revealedListIdsRef.current.has(list.id)
              }
              onRevealComplete={() => {
                revealedListIdsRef.current.add(list.id);
              }}
            >
              {
                list.listItems?.map((item: OptimisticListItem, index: number) =>
                  <ListItemComponent
                    key={item.id}
                    listItem={item}
                    index={index}
                    enqueue={enqueue}
                    shouldRevealOnMount={
                      Boolean(item.isOptimistic) && !revealedItemIdsRef.current.has(item.id)
                    }
                    onRevealComplete={() => {
                      revealedItemIdsRef.current.add(item.id);
                    }}
                  />)
              }
            </ListComponent>
          )
        }
      </div>
    </DragDropProvider>
  );
};

export default ListsContainer;