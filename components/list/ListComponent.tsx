"use client";

import { cn } from "@/lib/utils";
import { syncProjectedCurrentView } from "@/lib/dashboard-cache";
import { measureCacheWrite, useRenderMeasure } from "@/lib/optimistic-debug";
import type { OptimisticScope } from "@/hooks/useOptimisticSync";
import { useTRPC } from "@/trpc/client";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from '@dnd-kit/react/sortable';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar1, GripVertical, Plus, StickyNote } from "lucide-react";
import { motion } from "motion/react";
import { memo, ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import ListInlineEdit from "./ListInlineEdit";
import ListMenu from "./ListMenu";
import ListTagPicker from "./ListTagPicker";
import { CurrentView, List, ListItem, OptimisticListItem } from "./types";

function listIsOptimistic(list: List) {
  return Boolean("isOptimistic" in list && list.isOptimistic);
}

function itemIsAlreadyInCache(currentView: CurrentView | undefined, itemId: string) {
  return Boolean(
    currentView?.lists.some((currentList) =>
      currentList.listItems.some((item) => item.id === itemId)
    )
  );
}

function removeItemFromCache(currentView: CurrentView | undefined, itemId: string) {
  if (!currentView) return currentView;

  return {
    ...currentView,
    lists: currentView.lists.map((currentList) => ({
      ...currentList,
      listItems: currentList.listItems.filter((item) => item.id !== itemId),
    })),
  };
}

async function waitForSavedList(
  getCurrentView: () => CurrentView | undefined,
  listId: string
) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const currentList = getCurrentView()?.lists.find((list) => list.id === listId);

    if (currentList && !listIsOptimistic(currentList)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return false;
}

interface ListComponentProps {
  children: ReactNode;
  listValues: List;
  index: number;
  enqueue: (
    scope: OptimisticScope,
    task: () => Promise<void>,
    options?: { label?: string; rollback?: () => void }
  ) => Promise<void>;
  activeDropTarget: {
    type: string;
    id: string;
  } | null;
  shouldRevealOnMount?: boolean,
  onRevealComplete: () => void;
}

const ListComponent = ({
  children,
  listValues: list,
  index,
  enqueue,
  activeDropTarget,
  shouldRevealOnMount,
  onRevealComplete
}: ListComponentProps) => {

  useRenderMeasure(`ListComponent:${list.id}`);

  const listIsOnlyInBrowser = listIsOptimistic(list);

  const [listDeleted, setListDeleted] = useState<boolean>(false);
  const [listRevealed, setListRevealed] = useState(!shouldRevealOnMount);

  useEffect(() => {
    if (!shouldRevealOnMount) return;

    const timeout = setTimeout(() => {
      setListRevealed(true);
      onRevealComplete?.();
    }, 0);

    return () => clearTimeout(timeout);
  }, [shouldRevealOnMount, onRevealComplete, list.id]);

  const [createListItemName, setCreateListItemName] = useState<string>('');
  const [viewListItemAdder, setViewListItemAdder] = useState<boolean>(false);
  const [newItemId, setNewItemId] = useState(() => crypto.randomUUID());
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

  const { mutate: renameList, isPending: renameListPending } = useMutation(trpc.list.renameList.mutationOptions({
    async onMutate(variables) {
      await queryClient.cancelQueries({ queryKey });
      const previousListsWithItems = queryClient.getQueryData<CurrentView>(queryKey);

      queryClient.setQueryData<CurrentView>(queryKey, (old) => {
        if (!old) return old;

        const nextValue = {
          ...old,
          lists: old.lists.map((list) =>
            list.id === variables.id
              ? { ...list, name: variables.name }
              : list
          ),
        };

        measureCacheWrite("list.rename", nextValue);
        return nextValue;
      });
      syncProjectedCurrentView(queryClient, dashboardKeys);

      return { previousListsWithItems };
    },
    onError(_error, _variables, context) {
      if (context?.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
      }
    },
  }));

  const deleteListMutation = useMutation(trpc.list.deleteList.mutationOptions());

  const deleteList = (listId: string) => {
    // Snapshot before optimistic update
    const deletedList = queryClient.getQueryData<CurrentView>(queryKey)?.lists.find(
      (list: List) => list.id === listId
    );

    // Optimistically remove list from cache immediately
    queryClient.setQueryData<CurrentView>(queryKey,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          lists: old.lists.filter((list: List) => list.id !== listId),
        };
      }
    );
    syncProjectedCurrentView(queryClient, dashboardKeys);

    enqueue(
      "list-edits",
      async () => {
        if (listIsOnlyInBrowser) return;

        try {
          // Actual server request runs in order
          await deleteListMutation.mutateAsync({ listId });
        } catch (error) {
          // Rollback only if server really failed
          queryClient.setQueryData<CurrentView>(queryKey,
            (old) => {
              if (!old || !deletedList) return old;

              const alreadyRestored = old.lists.some((list: List) => list.id === listId);

              if (alreadyRestored) return old;

              return {
                ...old,
                lists: [...old.lists, deletedList].sort((a, b) => a.order - b.order),
              };
            }
          );
          syncProjectedCurrentView(queryClient, dashboardKeys);

          throw error;
        }
      },
      { label: "list.deleteList" }
    );
  };

  const { mutateAsync: createListItem } = useMutation(trpc.listItem.createListItem.mutationOptions({
    async onMutate(variables) {
      await queryClient.cancelQueries({ queryKey });

      const previousListsWithItems = queryClient.getQueryData<CurrentView>(queryKey);
      const alreadyInCache = itemIsAlreadyInCache(previousListsWithItems, variables.id);

      if (alreadyInCache) {
        // The UI already showed this item while its parent list was saving.
        return { previousListsWithItems, addedToCache: false };
      }

      const optimisticListItem: OptimisticListItem = {
        id: variables.id,
        name: variables.name,
        listId: variables.listId,
        order: list.listItems && list.listItems.length > 0
          ? Math.max(...list.listItems.map((item: ListItem) => item.order)) + 1
          : 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
        notes: ""
      };

      queryClient.setQueryData<CurrentView>(queryKey, (old) => {
        if (!old) return old;

        const nextValue = {
          ...old,
          lists: old.lists.map((currentList: List) =>
            currentList.id === variables.listId
              ? {
                ...currentList,
                listItems: [optimisticListItem, ...currentList.listItems],
              }
              : currentList
          ),
        };

        measureCacheWrite("item.create", nextValue);
        return nextValue;
      });
      syncProjectedCurrentView(queryClient, dashboardKeys);

      setCreateListItemName('');

      return { previousListsWithItems, addedToCache: true };
    },
    onSuccess(createdItem) {
      queryClient.setQueryData<CurrentView>(queryKey, (current) => {
        if (!current) return current;

        return {
          ...current,
          lists: current.lists.map((currentList) =>
            currentList.id === createdItem.listId
              ? {
                ...currentList,
                listItems: currentList.listItems.map((item) =>
                  item.id === createdItem.id ? createdItem : item
                ),
              }
              : currentList
          ),
        };
      });
      syncProjectedCurrentView(queryClient, dashboardKeys);
    },
    onError(_errors, variables, context) {
      if (context?.addedToCache && context.previousListsWithItems) {
        queryClient.setQueryData(queryKey, context.previousListsWithItems);
        return;
      }

      queryClient.setQueryData<CurrentView>(queryKey, (current) =>
        removeItemFromCache(current, variables.id)
      );
      syncProjectedCurrentView(queryClient, dashboardKeys);
    }
  }));

  const handleCreateItem = () => {
    const itemId = newItemId;
    const itemName = createListItemName.trim();

    if (!itemName) return;

    setNewItemId(crypto.randomUUID());

    if (listIsOnlyInBrowser) {
      // Show the item now, but wait for the parent list before calling the server.
      const optimisticListItem: OptimisticListItem = {
        id: itemId,
        name: itemName,
        listId: list.id,
        order: list.listItems && list.listItems.length > 0
          ? Math.max(...list.listItems.map((item: ListItem) => item.order)) + 1
          : 0,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
        notes: "",
      };

      queryClient.setQueryData<CurrentView>(queryKey, (current) => {
        if (!current) return current;

        return {
          ...current,
          lists: current.lists.map((currentList) =>
            currentList.id === list.id
              ? {
                ...currentList,
                listItems: [optimisticListItem, ...currentList.listItems],
              }
              : currentList
          ),
        };
      });
      syncProjectedCurrentView(queryClient, dashboardKeys);
      setCreateListItemName("");

      enqueue(
        "item-edits",
        async () => {
          const listWasSaved = await waitForSavedList(
            () => queryClient.getQueryData<CurrentView>(queryKey),
            list.id
          );

          if (!listWasSaved) {
            throw new Error("Parent list was not saved before item create.");
          }

          await createListItem({
            id: itemId,
            name: itemName,
            listId: list.id,
          });
        },
        { label: "listItem.createListItem.afterListCreate" }
      );
      return;
    }

    createListItem({
      id: itemId,
      name: itemName,
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

  const completedItems = list.listItems.filter((item: ListItem) => item.completed === true).length;
  const totalItems = list.listItems.length;
  const listDropId = `list-drop-${list.id}`;
  const isListDropTarget = activeDropTarget?.id === listDropId;
  const isItemInsideThisListDropTarget = activeDropTarget?.type === "list-item" &&
    list.listItems.some(
      (item: ListItem) => `list-item-${item.id}` === activeDropTarget.id
    );
  const shouldHighlightList = isListDropTarget || isItemInsideThisListDropTarget;

  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleViewListItemAdder() {
    if (inputRef.current) {
      setViewListItemAdder(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }

  function handleDeleteList() {
    setListDeleted(true);

    setTimeout(() => {
      deleteList(list.id);
    }, 250);
  }

  return (
    <motion.div
      layout
      transition={{
        layout: {
          duration: 0.25,
          ease: "easeOut",
        },
      }}
      ref={listRef}
    >
      <div
        className={cn(
          "transition-all duration-300 ease-in-out h-full shrink-0",

          // creation
          !listDeleted && listRevealed && (
            "max-h-200 opacity-100 translate-y-0"
          ),

          // before reveal
          !listDeleted && !listRevealed && (
            "max-h-0 opacity-0"
          ),

          // deletion
          listDeleted && (
            "opacity-0 -translate-y-4"
          )
        )}
      >
          <Card data-list-id={list.id} className={`transition-all duration-300 h-full min-h-92.5 flex flex-col ${isDragging ? "scale-[1.03] backdrop-blur-[5px] shadow-xl" : ""}`}>
          <CardContent className="px-0 flex flex-col flex-1">
            <div className="flex flex-col flex-1">
              <div className="flex items-start gap-3 px-4">
                <div
                  ref={handleRef}
                  className="-mt-1 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none p-2 -m-2"
                >
                  <GripVertical />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <ListInlineEdit
                    className="block font-semibold leading-7! text-xl!"
                    inputClassName=""
                    displayClassName=""
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

                <ListMenu
                  handleViewListItemAdder={handleViewListItemAdder}
                  handleDeleteList={handleDeleteList}
                />
              </div>

              <div className="my-2 mx-13 mr-14">
                <ListTagPicker listId={list.id} selectedListTags={list.listTags} />
              </div>

              <Separator />

              <div className={cn("border border-zinc-100 border-dashed rounded-lg duration-200 mx-2 my-1.5 flex-col", {
                "border-zinc-400": shouldHighlightList
              })}>

                <ScrollArea
                  ref={dropRef}
                  className={cn("h-60! min-h-45 w-full touch-pan-y relative")}
                >
                  <div
                    className={cn(
                      `flex items-start max-h-12 gap-1.5 pl-px py-px rounded-md pr-2 hover:bg-gray-50 hover:border-gray-100 overflow-hidden transition-[max-height,opacity,transform,padding,scale,shadow] duration-200 ease-in-out group`, {
                      "max-h-0 opacity-0 py-0": !viewListItemAdder,
                    }
                    )}
                  >
                    <div
                      className="touch-none select-none p-1.5 -mt-px -mr-1 shrink-0 text-gray-400"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <Checkbox
                      className="w-4 h-4 shrink-0 hover:cursor-default! my-1"
                      disabled={true}
                    />

                    <div className="min-w-0 flex-1">
                      <Textarea
                        ref={inputRef}
                        value={createListItemName}
                        placeholder="Add new item here..."
                        className="rounded-md flex-1 min-h-5 resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-6 shadow-none focus-visible:ring-0 break-normal!"
                        onChange={(e) => {
                          setCreateListItemName(e.target.value);
                        }}
                        onBlur={() => {
                          if (createListItemName.trim()) {
                            handleCreateItem();
                          }

                          setCreateListItemName("");
                          setViewListItemAdder(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();

                            if (!createListItemName.trim()) return;

                            handleCreateItem();
                          }

                          if (e.key === "Escape") {
                            setCreateListItemName("");
                            setViewListItemAdder(false);
                          }
                        }}
                      />
                    </div>
                    <Button
                      className="scale-80 shrink-0 self-start opacity-100 duration-100 transition-all"
                      variant="ghost"
                      size="icon-xs"
                      onMouseDown={(e) => {
                        e.preventDefault();

                        if (!createListItemName.trim()) return;

                        handleCreateItem();
                      }}
                    >
                      <Plus />
                    </Button>
                  </div>
                  {children}
                  {totalItems == 0 &&
                    <div className="w-0 h-0 absolute flex items-center justify-center left-1/2 top-1/2">
                      <StickyNote className="overflow-clip text-zinc-400/80" />
                    </div>}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>

  );
};

export default memo(ListComponent);

