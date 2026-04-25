"use client";

import { useTRPC } from "@/trpc/client";
import { useSortable } from "@dnd-kit/react/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, X } from "lucide-react";
import { useState } from "react";
import ListInlineEdit from "./ListInlineEdit";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ListItem, Lists } from "./types";

interface ListItemComponentProps {
  listItem: ListItem;
  index: number;
  enqueue: (task: () => Promise<void>, onQueueEmpty?: (() => void) | undefined) => Promise<void>;
}

const ListItemComponent = ({
  listItem,
  index,
  enqueue
}: ListItemComponentProps) => {

  const [itemDeleted, setItemDeleted] = useState<boolean>(false);

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
      className={`
    flex justify-between items-center gap-2 px-2 rounded-md border border-white hover:bg-gray-50 hover:border hover:border-gray-100
    overflow-hidden transition-[max-height,opacity,transform,padding,scale,shadow] duration-200 ease-in-out group
    ${isDragging
          ? "scale-[1.01] backdrop-blur-[5px] shadow-md bg-gray-50 border border-gray-100"
          : ""}
    ${itemDeleted
          ? "max-h-0 opacity-0 py-0"
          : "max-h-12 opacity-100 scale-100"
        }
  `}
    >
      <div className="flex items-center gap-2">
        <div
          ref={itemHandle}
          className="cursor-grab active:cursor-grabbing touch-none select-none p-2 -m-2 -mr-1 shrink-0 text-gray-400"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <Checkbox
          className="w-5 h-5 hover:cursor-pointer"
          checked={listItem.completed}
          onClick={() => {
            setCompletion({
              id: listItem.id,
              completed: !listItem.completed
            });
          }}
        />
        <ListInlineEdit
          className={`block text-lg truncate w-full leading-8 transition-colors duration-300 ${listItem.completed ? "line-through text-gray-500" : ""}`}
          id={listItem.id}
          value={listItem.name}
          onSave={renameListItem}
          disabled={renameListItemPending}
          displayClassName="leading-[32px]!"
          inputClassName="text-lg! mb-[0.6px]"
        />
      </div>
      <Button
        className="bg-transparent hover:bg-red-500/10 group-hover:opacity-100 md:opacity-0 transition-opacity duration-100"
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