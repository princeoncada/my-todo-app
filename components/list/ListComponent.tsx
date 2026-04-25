"use client";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from '@dnd-kit/react/sortable';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar1, GripVertical, ListPlus, ListX, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { ReactNode, useRef, useState } from "react";
import ListInlineEdit from "./ListInlineEdit";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../ui/input-group";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { List, ListItem, Lists } from "./types";

interface ListComponentProps {
  children: ReactNode;
  listValues: List;
  index: number;
  enqueue: (task: () => Promise<void>, onQueueEmpty?: (() => void) | undefined) => Promise<void>;
  activeDropTarget: {
    type: string;
    id: string;
  } | null;
}

const ListComponent = ({
  children,
  listValues: list,
  index,
  enqueue,
  activeDropTarget
}: ListComponentProps) => {

  const [createListItemName, setCreateListItemName] = useState<string>('');
  const [viewListItemAdder, setViewListItemAdder] = useState<boolean>(false);
  const [newItemId, setNewItemId] = useState(() => crypto.randomUUID());
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.getListsWithItems.queryKey();

  const { mutate: renameList, isPending: renameListPending } = useMutation(trpc.renameList.mutationOptions({
    async onMutate(variables) {
      const queryKey = trpc.getListsWithItems.queryKey();
      await queryClient.cancelQueries({ queryKey });
      const previousListsWithItems = queryClient.getQueryData<Array<List>>(queryKey);

      queryClient.setQueryData<Lists>(queryKey, (old) => {
        if (!old) return old;

        return old.map((list) =>
          list.id === variables.id
            ? { ...list, name: variables.name }
            : list
        );
      });

      return { previousListsWithItems };
    },
    onError(_error, _variables, context) {
      const queryKey = trpc.getListsWithItems.queryKey();

      if (context?.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
      }
    },
  }));

  const deleteListMutation = useMutation(trpc.deleteList.mutationOptions());

  const deleteList = (listId: string) => {
    // Snapshot before optimistic update
    const deletedList = queryClient.getQueryData<Lists>(queryKey)?.find(
      (list) => list.id === listId
    );

    // Optimistically remove list from cache immediately
    queryClient.setQueryData<Lists>(queryKey,
      (old) => {
        if (!old) return old;
        return old.filter((list) => list.id !== listId);
      }
    );

    enqueue(
      async () => {
        try {
          // Actual server request runs in order
          await deleteListMutation.mutateAsync({ listId });
        } catch (error) {
          // Rollback only if server really failed
          queryClient.setQueryData<Lists>(queryKey,
            (old) => {
              if (!old || !deletedList) return old;

              const alreadyRestored = old.some((list) => list.id === listId);

              if (alreadyRestored) return old;

              return [...old, deletedList].sort((a, b) => a.order - b.order);
            }
          );

          throw error;
        }
      }
    );
  };

  const { mutate: createListItem } = useMutation(trpc.createListItem.mutationOptions({
    async onMutate(variables) {
      const queryKey = trpc.getListsWithItems.queryKey();

      await queryClient.cancelQueries({ queryKey });

      const previousListsWithItems = queryClient.getQueryData<Lists>(queryKey);

      const optimisticListItem: ListItem = {
        id: variables.id,
        name: variables.name,
        listId: variables.listId,
        order: list.listItems && list.listItems.length > 0
          ? Math.max(...list.listItems.map((item) => item.order)) + 1
          : 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      queryClient.setQueryData(queryKey, (old: Lists | undefined) =>
        old
          ? old.map((currentList) =>
            currentList.id === variables.listId
              ? {
                ...currentList,
                listItems: [optimisticListItem, ...currentList.listItems],
              }
              : currentList
          )
          : []
      );

      setCreateListItemName('');

      return { previousListsWithItems };
    },
    onError(_errors, _variables, context) {
      const queryKey = trpc.getListsWithItems.queryKey();

      if (context?.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
      }
    }
  }));

  const handleCreateItem = () => {
    setNewItemId(crypto.randomUUID());
    createListItem({
      id: newItemId,
      name: createListItemName.trim(),
      listId: list.id
    });
  };

  const { ref: listRef, handleRef, isDragging } = useSortable({
    id: `list-${list.id}`,
    index,
    type: "list",
    accept: "list",
    group: "lists",
  });

  const { ref: dropRef } = useDroppable({
    id: `list-drop-${list.id}`,
    type: "list-drop",
    accept: "list-item",
  });

  const completedItems = list.listItems.filter((item) => item.completed === true).length;
  const totalItems = list.listItems.length;
  const listDropId = `list-drop-${list.id}`;
  const isListDropTarget = activeDropTarget?.id === listDropId;
  const isItemInsideThisListDropTarget = activeDropTarget?.type === "list-item" &&
    list.listItems.some(
      (item) => `list-item-${item.id}` === activeDropTarget.id
    );
  const shouldHighlightList = isListDropTarget || isItemInsideThisListDropTarget;

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      ref={listRef}
      layout
      className="h-full"
    >
      <Card data-list-id={list.id} className={`transition-all duration-300 h-full min-h-92.5 flex flex-col ${isDragging ? "scale-[1.03] backdrop-blur-[5px] shadow-xl" : ""}`}>
        <CardContent className="px-0 flex flex-col flex-1">
          <div className="flex flex-col flex-1">
            <div className="flex items-start gap-3 px-4">
              <div
                ref={handleRef}
                className="mt-1 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none p-2 -m-2"
              >
                <GripVertical />
              </div>

              <div className="flex-1 min-w-0">
                <ListInlineEdit
                  className="block truncate w-full font-semibold"
                  inputClassName="text-xl! h-6! mb-[5px]!"
                  displayClassName="text-xl! leading-[23px] h-6!"
                  id={list.id}
                  value={list.name}
                  onSave={renameList}
                  disabled={renameListPending}
                />

                <div className="text-gray-500 flex items-center gap-2">
                  <Calendar1 className="w-4 h-4 shrink-0" />
                  <span>{list.createdAt.toISOString().split("T")[0].replaceAll("-", "/")}</span>
                </div>
              </div>

              <Button
                className="bg-white hover:bg-red-500/10 shrink-0"
                variant="destructive"
                size="icon-lg"
                onClick={() => {
                  deleteList(list.id);
                }}
              >
                <Trash2 />
              </Button>
            </div>

            <Separator className="mt-4 mb-0.5" />

            <div className={cn("border border-zinc-100 border-dashed rounded-lg duration-200 mx-2 my-1.5 flex-col", {
              "border-zinc-400": shouldHighlightList
            })}>
              <div className={cn("text-lg px-2 max-h-12 opacity-100 mt-1 rounded-md flex items-center gap-2 overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out", {
                "max-h-0 opacity-0 mt-0": !viewListItemAdder
              })}>
                <div
                  className="cursor-grab active:cursor-grabbing touch-none select-none p-2 -m-2 -mr-1 shrink-0 text-gray-400"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <Checkbox
                  className="w-5 h-5 hover:cursor-pointer"
                  disabled={true}
                />
                <InputGroup className="focus-visible:ring-0 border-0 -mr-0.5">
                  <InputGroupInput
                    className="truncate w-full text-lg! h-7.5 leading-0! font-medium pl-0!"
                    placeholder="Add new item here..."
                    ref={inputRef}
                    value={createListItemName}
                    onChange={(e) => {
                      setCreateListItemName(e.target.value);
                    }}
                    onBlur={() => {
                      setCreateListItemName('');
                      setViewListItemAdder(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateItem();
                      }

                      if (e.key === "Escape") {
                        setCreateListItemName('');
                        setViewListItemAdder(false);
                      }
                    }}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      variant="ghost"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCreateItem();
                      }}
                    >
                      <Plus className="scale-90 text-zinc-700" />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <ScrollArea
                ref={dropRef}
                className={cn("h-60! min-h-45 w-full touch-pan-y")}
              >
                {children}
              </ScrollArea>
            </div>

          </div>

          <div className="h-4 relative top-0 mt-2 flex items-center w-full">
            {
              totalItems !== 0 &&
              <div className={cn("text-center text-sm absolute w-full flex items-center justify-center")}>
                {completedItems} of {totalItems} completed
              </div>
            }
            <div className="text-center absolute h-0 left-2 flex items-center justify-center">
              <Button
                size="icon"
                className={cn("flex", {
                  "hidden": viewListItemAdder
                })}
                variant="ghost"
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                    setViewListItemAdder(true);
                  }
                }}
              >
                <ListPlus className="scale-120" />
              </Button>
              <Button
                size="icon"
                className={cn("flex", {
                  "hidden": !viewListItemAdder
                })}
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  setViewListItemAdder(false);
                }}
              >
                <ListX className="scale-120" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ListComponent;

