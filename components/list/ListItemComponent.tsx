"use client";

import { useTRPC } from "@/trpc/client";
import { useSortable } from "@dnd-kit/react/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import ListInlineEdit from "./ListInlineEdit";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { CurrentView, List, ListItem } from "./types";
import { cn } from "@/lib/utils";
import { syncProjectedCurrentView } from "@/lib/dashboard-cache";
import { measureCacheWrite, useRenderMeasure } from "@/lib/optimistic-debug";
import type { OptimisticScope } from "@/hooks/useOptimisticSync";


interface ListItemComponentProps {
  listItem: ListItem;
  index: number;
  enqueue: (
    scope: OptimisticScope,
    task: () => Promise<void>,
    options?: { label?: string; rollback?: () => void }
  ) => Promise<void>;
  shouldRevealOnMount?: boolean;
  onRevealComplete?: () => void;
}

const ListItemComponent = ({
  listItem,
  index,
  enqueue,
  shouldRevealOnMount,
  onRevealComplete
}: ListItemComponentProps) => {

  useRenderMeasure(`ListItemComponent:${listItem.id}`);

  const itemIsOnlyInBrowser = Boolean(
    "isOptimistic" in listItem && listItem.isOptimistic
  );

  const [itemDeleted, setItemDeleted] = useState<boolean>(false);
  const [itemRevealed, setItemRevealed] = useState(!shouldRevealOnMount);

  useEffect(() => {
    if (!shouldRevealOnMount) return;

    const timeout = setTimeout(() => {
      setItemRevealed(true);
      onRevealComplete?.();
    }, 0);

    return () => clearTimeout(timeout);
  }, [shouldRevealOnMount, onRevealComplete, listItem.id]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewsQueryKey = trpc.view.getAll.queryKey();
  const queryKey = trpc.view.getAllListsWithItems.queryKey();
  const currentViewQueryKey = trpc.view.getCurrentViewListsWithItems.queryKey();
  const dashboardKeys = {
    views: viewsQueryKey,
    allLists: queryKey,
    currentView: currentViewQueryKey,
  };

  const { mutate: renameListItem, isPending: renameListItemPending } = useMutation(trpc.listItem.renameListItem.mutationOptions({
    async onMutate(variables) {
      await queryClient.cancelQueries({ queryKey });
      const previousListsWithItems = queryClient.getQueryData<CurrentView>(queryKey);

      queryClient.setQueryData<CurrentView>(queryKey, (old) => {
        if (!old) return old;

        const nextValue = {
          ...old,
          lists: old.lists.map((list: List) => ({
            ...list,
            listItems: list.listItems.map((item: ListItem) =>
              item.id === variables.id
                ? { ...item, name: variables.name }
              : item
            ),
          })),
        };

        measureCacheWrite("item.rename", nextValue);
        return nextValue;
      });
      syncProjectedCurrentView(queryClient, dashboardKeys);

      return { previousListsWithItems };
    },
    onError(_error, _variables, context) {
      if (context?.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
      }
    }
  }));

  const deleteItemMutation = useMutation(trpc.listItem.deleteListItem.mutationOptions());

  const deleteItem = (itemId: string) => {
    // Find the parent list before deleting
    const parentList = queryClient.getQueryData<CurrentView>(queryKey)?.lists.find(
      (list: List) => list.listItems.some(
        (item: ListItem) => item.id === itemId)
    );

    // Snapshot of item before optimistic update
    const deletedItem = parentList?.listItems.find(
      (item: ListItem) => item.id === itemId
    );

    // Save original position for rollback
    const deletedItemIndex = parentList?.listItems.findIndex(
      (item: ListItem) => item.id === itemId
    );

    // Stop if item does not exist in cache
    if (!parentList || !deletedItem || deletedItemIndex === undefined) return;

    // Optimistically remove listItem from cache immediately
    setTimeout(() => {
      queryClient.setQueryData<CurrentView>(queryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            lists: old.lists.map((list: List) => {
              // Only updated the parent list
              if (list.id !== parentList.id) return list;

              return {
                ...list,
                listItems: list.listItems.filter((item: ListItem) => item.id !== itemId)
              };
            }),
          };
        }
      );
      syncProjectedCurrentView(queryClient, dashboardKeys);
    }, 200);

    enqueue(
      "item-edits",
      async () => {
        if (itemIsOnlyInBrowser) return;

        try {
          // Actual server request runs in order
          await deleteItemMutation.mutateAsync({ id: itemId });
        } catch (error) {
          // Rollback UI animation state
          setItemDeleted(false);

          queryClient.setQueryData<CurrentView>(queryKey,
            (old) => {
              if (!old || !deletedItem) return old;

              return {
                ...old,
                lists: old.lists.map((list: List) => {
                  // Only restore into original parent list
                  if (list.id !== parentList.id) return list;

                  const alreadyRestored = list.listItems.some(
                    (item: ListItem) => item.id === itemId
                  );

                  if (alreadyRestored) return list;

                  const restoredItems = [...list.listItems];

                  // Put item back in original position
                  restoredItems.splice(deletedItemIndex, 0, deletedItem);

                  return {
                    ...list,
                    listItems: restoredItems.sort((a, b) => a.order - b.order)
                  };
                }),
              };
            });
          syncProjectedCurrentView(queryClient, dashboardKeys);

          throw error;
        }
      },
      { label: "listItem.deleteListItem" }
    );
  };

  const { mutate: setCompletion } = useMutation(trpc.listItem.setCompletionListItem.mutationOptions({
    async onMutate(variables) {
      await queryClient.cancelQueries({ queryKey });
      const previousListsWithItems = queryClient.getQueryData<CurrentView>(queryKey);

      queryClient.setQueryData<CurrentView>(queryKey, (old) => {
        if (!old) return old;

        const nextValue = {
          ...old,
          lists: old.lists.map((list: List) => ({
            ...list,
            listItems: list.listItems.map((item: ListItem) =>
              item.id === variables.id
                ? { ...item, completed: variables.completed }
              : item
            ),
          })),
        };

        measureCacheWrite("item.complete", nextValue);
        return nextValue;
      });
      syncProjectedCurrentView(queryClient, dashboardKeys);

      return { previousListsWithItems };
    },
    onError(_error, _variables, context) {
      if (context?.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
      }
    }
  }));

  const { ref, handleRef: itemHandle, isDragging } = useSortable({
    id: `list-item-${listItem.id}`,
    index,
    type: 'list-item',
    accept: 'list-item',
    group: "list-items"
  });

  return (
    <div
      ref={ref}
      className={cn(
        `flex items-start gap-1.5 pr-1.5 rounded-md border border-white hover:bg-gray-50 hover:border-gray-100 overflow-hidden transition-[max-height,opacity,transform,padding,scale,shadow] duration-200 ease-in-out group`,
        {
          "scale-[1.01] backdrop-blur-[5px] shadow-md bg-gray-50 border border-gray-100": isDragging,
          "max-h-200 opacity-100 scale-100": !itemDeleted && itemRevealed,
          "max-h-0 opacity-0 py-0": itemDeleted || !itemRevealed,
        }
      )}
    >
      <div
        ref={itemHandle}
        className="cursor-grab active:cursor-grabbing touch-none select-none p-1.5 -mt-px -mr-1 shrink-0 text-gray-400"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <Checkbox
        className="w-4 h-4 shrink-0 hover:cursor-pointer my-1"
        checked={listItem.completed}
        onClick={() => {
          setCompletion({
            id: listItem.id,
            completed: !listItem.completed,
          });
        }}
      />

      <div className="min-w-0 flex-1">
        <ListInlineEdit
          className={cn(
            "block w-full min-w-0 text-sm whitespace-normal break-all break-normal transition-colors duration-300 leading-6!",
            listItem.completed && "line-through text-gray-500"
          )}
          id={listItem.id}
          value={listItem.name}
          onSave={renameListItem}
          disabled={renameListItemPending}
          displayClassName="whitespace-normal"
          inputClassName="text-sm! p-0! leading-6! break-normal!"
        />
      </div>

      <Button
        className="scale-80 shrink-0 self-start bg-transparent hover:bg-red-500/10 opacity-100 transition-all duration-100"
        variant="destructive"
        size="icon-xs"
        onClick={() => {
          setItemDeleted(true);
          deleteItem(listItem.id);
        }}
      >
        <X />
      </Button>
    </div>
  );
};

export default memo(ListItemComponent);
