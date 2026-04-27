"use client";

import { useTRPC } from "@/trpc/client";
import { useSortable } from "@dnd-kit/react/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, X } from "lucide-react";
import { useEffect, useState } from "react";
import ListInlineEdit from "./ListInlineEdit";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ListItem, Lists } from "./types";
import { cn } from "@/lib/utils";


interface ListItemComponentProps {
  listItem: ListItem;
  index: number;
  enqueue: (task: () => Promise<void>, onQueueEmpty?: (() => void) | undefined) => Promise<void>;
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
  const queryKey = trpc.getListsWithItems.queryKey();

  const { mutate: renameListItem, isPending: renameListItemPending } = useMutation(trpc.renameListItem.mutationOptions({
    async onMutate(variables) {
      const queryKey = trpc.getListsWithItems.queryKey();
      await queryClient.cancelQueries({ queryKey });
      const previousListsWithItems = queryClient.getQueryData<Lists>(queryKey);

      queryClient.setQueryData<Lists>(queryKey, (old) => {
        if (!old) return old;

        return old.map((list) => ({
          ...list,
          listItems: list.listItems.map((item) =>
            item.id === variables.id
              ? { ...item, name: variables.name }
              : item
          ),
        }));
      });

      return { previousListsWithItems };
    },
    onError(_error, _variables, context) {
      const queryKey = trpc.getListsWithItems.queryKey();

      if (context?.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
      }
    }
  }));

  const deleteItemMutation = useMutation(trpc.deleteListItem.mutationOptions());

  const deleteItem = (itemId: string) => {
    // Find the parent list before deleting
    const parentList = queryClient.getQueryData<Lists>(queryKey)?.find(
      (list) => list.listItems.some(
        (item) => item.id === itemId)
    );

    // Snapshot of item before optimistic update
    const deletedItem = parentList?.listItems.find(
      (item) => item.id === itemId
    );

    // Save original position for rollback
    const deletedItemIndex = parentList?.listItems.findIndex(
      (item) => item.id === itemId
    );

    // Stop if item does not exist in cache
    if (!parentList || !deletedItem || deletedItemIndex === undefined) return;

    // Optimistically remove listItem from cache immediately
    setTimeout(() => {
      queryClient.setQueryData<Lists>(queryKey,
        (old) => {
          if (!old) return old;
          return old.map((list) => {
            // Only updated the parent list
            if (list.id !== parentList.id) return list;

            return {
              ...list,
              listItems: list.listItems.filter((item) => item.id !== itemId)
            };
          });
        }
      );
    }, 200);

    enqueue(
      async () => {
        try {
          // Actual server request runs in order
          await deleteItemMutation.mutateAsync({ id: itemId });
        } catch (error) {
          // Rollback UI animation state
          setItemDeleted(false);

          queryClient.setQueryData<Lists>(queryKey,
            (old) => {
              if (!old || !deletedItem) return old;

              return old.map((list) => {
                // Only restore into original parent list
                if (list.id !== parentList.id) return list;

                const alreadyRestored = list.listItems.some(
                  (item) => item.id === itemId
                );

                if (alreadyRestored) return list;

                const restoredItems = [...list.listItems];

                // Put item back in original position
                restoredItems.splice(deletedItemIndex, 0, deletedItem);

                return {
                  ...list,
                  listItems: restoredItems.sort((a, b) => a.order - b.order)
                };
              });
            });

          throw error;
        }
      }
    );
  };

  const { mutate: setCompletion } = useMutation(trpc.setCompletionListItem.mutationOptions({
    async onMutate(variables) {
      const queryKey = trpc.getListsWithItems.queryKey();
      await queryClient.cancelQueries({ queryKey });
      const previousListsWithItems = queryClient.getQueryData<Lists>(queryKey);

      queryClient.setQueryData<Lists>(queryKey, (old) => {
        if (!old) return old;

        return old.map((list) => ({
          ...list,
          listItems: list.listItems.map((item) =>
            item.id === variables.id
              ? { ...item, completed: variables.completed }
              : item
          ),
        }));
      });

      return { previousListsWithItems };
    },
    onError(_error, _variables, context) {
      const queryKey = trpc.getListsWithItems.queryKey();

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
        `flex items-start gap-1.5 px-1.5 rounded-md border border-white hover:bg-gray-50 hover:border-gray-100 overflow-hidden transition-[max-height,opacity,transform,padding,scale,shadow] duration-200 ease-in-out group`,
        {
          "scale-[1.01] backdrop-blur-[5px] shadow-md bg-gray-50 border border-gray-100": isDragging,
          "max-h-200 opacity-100 scale-100": !itemDeleted && itemRevealed,
          "max-h-0 opacity-0 py-0": itemDeleted || !itemRevealed,
        }
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <div
          ref={itemHandle}
          className="cursor-grab active:cursor-grabbing touch-none select-none p-1.5 -m-1.5 -mr-0.5 shrink-0 text-gray-400 pt-2"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <Checkbox
          className="w-4 h-4 shrink-0 hover:cursor-pointer mt-0.5"
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
              "block w-full min-w-0 text-sm pt-px! whitespace-normal break-all break-normal transition-colors duration-300 leading-5.5!",
              listItem.completed && "line-through text-gray-500"
            )}
            id={listItem.id}
            value={listItem.name}
            onSave={renameListItem}
            disabled={renameListItemPending}
            displayClassName="whitespace-normal"
            inputClassName="text-sm! p-0! leading-5.5! break-normal!"
          />
        </div>
      </div>

      <Button
        className="h-6 w-6 shrink-0 self-start bg-transparent hover:bg-red-500/10 opacity-100 transition-opacity duration-100 mt-px"
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

export default ListItemComponent;