"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/lib/trpc";
import type { CurrentView, Lists } from "./types";
import {
  applyTagChangeToCaches,
  DashboardKeys,
  DashboardSnapshot,
  reconcileAffectedViewLists,
  reconcileSavedListTags,
  ViewsCache,
} from "@/lib/dashboard-cache";
import { measureCacheWrite, measureRequest, useRenderMeasure } from "@/lib/optimistic-debug";

type TagValue = RouterOutputs["tag"]["getAll"][number];
type ListTagValue = Lists[number]["listTags"][number];
type TagColor = TagValue["color"];

type ListTagPickerProps = {
  listId: string;
  selectedListTags: ListTagValue[];
  dashboardKeys: DashboardKeys;
};

function listIsStillOptimistic(currentView: CurrentView | undefined, listId: string) {
  const list = currentView?.lists.find((currentList) => currentList.id === listId);

  return Boolean(
    list &&
    "isOptimistic" in list &&
    list.isOptimistic
  );
}

const TAG_COLORS: TagColor[] = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
];

const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  gray: "bg-zinc-100 text-zinc-700 border-zinc-200",
  red: "bg-red-100 text-red-700 border-red-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  green: "bg-green-100 text-green-700 border-green-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
};

export default function ListTagPicker({
  listId,
  selectedListTags,
  dashboardKeys,
}: ListTagPickerProps) {
  useRenderMeasure(`ListTagPicker:${listId}`);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const tagsQueryKey = trpc.tag.getAll.queryKey();
  const queryKey = dashboardKeys.allLists;
  const pendingTagOperationsRef = useRef(new Map<string, "add" | "remove">());
  const tagFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tagSaveChainRef = useRef(Promise.resolve());
  const tagRollbackSnapshotRef = useRef<{
    allLists: DashboardSnapshot | undefined;
    currentView: CurrentView | undefined;
    selectedView: CurrentView | undefined;
    views: ViewsCache | undefined;
  } | null>(null);

  const { data: tags = [] } = useQuery(trpc.tag.getAll.queryOptions());

  const selectedTagIds = useMemo(
    () => selectedListTags.map((listTag) => listTag.tagId),
    [selectedListTags]
  );

  const selectedTags = useMemo(
    () => selectedListTags.map((listTag) => listTag.tag),
    [selectedListTags]
  );

  const filteredTags = useMemo(() => {
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [tags, search]);

  const exactTagExists = tags.some(
    (tag) => tag.name.toLowerCase() === search.trim().toLowerCase()
  );

  const setTagInListsCache = (tag: TagValue) => {
    const updateTag = (currentView: CurrentView | undefined) =>
      currentView
        ? {
          ...currentView,
          lists: currentView.lists.map((list) => ({
            ...list,
            listTags: list.listTags.map((listTag) =>
              listTag.tagId === tag.id ? { ...listTag, tag } : listTag
            ),
          })),
        }
        : currentView;

    queryClient.setQueryData<CurrentView>(dashboardKeys.allLists, updateTag);
    queryClient.setQueryData<CurrentView>(dashboardKeys.currentView, updateTag);
    queryClient.setQueryData<CurrentView>(dashboardKeys.selectedView, updateTag);
  };

  const addTagToListCache = (tag: TagValue) => {
    applyTagChangeToCaches(queryClient, dashboardKeys, listId, tag, "add");
  };

  const removeTagFromListCache = (tagId: string) => {
    const tag = tags.find((tag) => tag.id === tagId);
    if (!tag) return;

    applyTagChangeToCaches(queryClient, dashboardKeys, listId, tag, "remove");
  };

  const applyListTagChangesMutation = useMutation(
    trpc.tag.applyListTagChanges.mutationOptions()
  );

  const cancelTagCacheQueries = () =>
    Promise.all([
      queryClient.cancelQueries({ queryKey: tagsQueryKey }),
      queryClient.cancelQueries({ queryKey: dashboardKeys.views }),
      queryClient.cancelQueries({ queryKey: dashboardKeys.allLists }),
      queryClient.cancelQueries({ queryKey: dashboardKeys.currentView }),
      queryClient.cancelQueries({ queryKey: dashboardKeys.selectedView }),
      queryClient.cancelQueries({
        predicate: (query) =>
          JSON.stringify(query.queryKey).includes("getViewListsWithItems"),
      }),
    ]);

  const scheduleTagFlush = (
    tag: TagValue | ListTagValue["tag"],
    action: "add" | "remove"
  ) => {
    const cacheTag: TagValue = "listTags" in tag
      ? tag
      : { ...tag, listTags: [] };

    void (async () => {
      await cancelTagCacheQueries();

      if (!tagRollbackSnapshotRef.current) {
        tagRollbackSnapshotRef.current = {
          allLists: queryClient.getQueryData<DashboardSnapshot>(queryKey),
          currentView: queryClient.getQueryData<CurrentView>(dashboardKeys.currentView),
          selectedView: queryClient.getQueryData<CurrentView>(dashboardKeys.selectedView),
          views: queryClient.getQueryData<ViewsCache>(dashboardKeys.views),
        };
      }

      pendingTagOperationsRef.current.set(cacheTag.id, action);
      // Tags update the cache right away, but the server save waits for the short batch window.
      applyTagChangeToCaches(queryClient, dashboardKeys, listId, cacheTag, action);
      measureCacheWrite("list-tags.toggle", { listId, tagId: cacheTag.id, action });

      if (tagFlushTimeoutRef.current) {
        clearTimeout(tagFlushTimeoutRef.current);
      }

      tagFlushTimeoutRef.current = setTimeout(() => {
        const currentLists = queryClient.getQueryData<CurrentView>(queryKey);

        if (listIsStillOptimistic(currentLists, listId)) {
          // Newly created lists may not exist on the server yet. Wait instead of sending a temporary id.
          scheduleTagFlush(cacheTag, action);
          return;
        }

        const operations = Array.from(pendingTagOperationsRef.current.entries()).map(
          ([tagId, action]) => ({ tagId, action })
        );
        const rollbackSnapshot = tagRollbackSnapshotRef.current;

        pendingTagOperationsRef.current.clear();
        tagRollbackSnapshotRef.current = null;

        if (operations.length === 0) return;

        tagSaveChainRef.current = tagSaveChainRef.current
          .catch(() => undefined)
          .then(async () => {
            measureRequest("tag.applyListTagChanges", {
              listId,
              count: operations.length,
            });
            const result = await applyListTagChangesMutation.mutateAsync({
              listId,
              operations,
            });

            reconcileSavedListTags(
              queryClient,
              dashboardKeys,
              result.listId,
              result.listTags
            );
            reconcileAffectedViewLists(
              queryClient,
              dashboardKeys,
              result.affectedViews
            );
          })
          .catch((error) => {
            queryClient.setQueryData(queryKey, rollbackSnapshot?.allLists);
            queryClient.setQueryData(dashboardKeys.currentView, rollbackSnapshot?.currentView);
            queryClient.setQueryData(dashboardKeys.selectedView, rollbackSnapshot?.selectedView);
            queryClient.setQueryData(dashboardKeys.views, rollbackSnapshot?.views);
            console.error("Tag sync failed:", error);
          });
      }, 150);
    })();
  };

  const createTagMutation = useMutation(trpc.tag.create.mutationOptions({
    async onMutate(newTag) {
      await queryClient.cancelQueries({ queryKey: tagsQueryKey });

      const previousTags = queryClient.getQueryData<TagValue[]>(tagsQueryKey);
      const optimisticTag: TagValue = {
        id: newTag.id,
        name: newTag.name,
        color: newTag.color ?? "gray",
        userId: "optimistic",
        createdAt: new Date(),
        updatedAt: new Date(),
        listTags: [],
      };

      queryClient.setQueryData<TagValue[]>(tagsQueryKey, (currentTags = []) => [
        ...currentTags,
        optimisticTag,
      ].sort((a, b) => a.name.localeCompare(b.name)));
      addTagToListCache(optimisticTag);

      return { previousTags };
    },
    onError(_error, variables, context) {
      queryClient.setQueryData(tagsQueryKey, context?.previousTags);
      removeTagFromListCache(variables.id);
    },
    onSuccess(createdTag) {
      queryClient.setQueryData<TagValue[]>(tagsQueryKey, (currentTags = []) =>
        currentTags.map((tag) => tag.id === createdTag.id ? {
          ...createdTag,
          listTags: tag.listTags,
        } : tag)
      );
      setTagInListsCache({ ...createdTag, listTags: [] });
    },
  }));

  const updateTagMutation = useMutation(trpc.tag.update.mutationOptions({
    async onMutate(updatedTag) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: tagsQueryKey }),
        queryClient.cancelQueries({ queryKey: dashboardKeys.allLists }),
        queryClient.cancelQueries({ queryKey: dashboardKeys.currentView }),
        queryClient.cancelQueries({ queryKey: dashboardKeys.selectedView }),
      ]);

      const previousTags = queryClient.getQueryData<TagValue[]>(tagsQueryKey);
      const previousLists = queryClient.getQueryData<CurrentView>(queryKey);
      const previousCurrentView = queryClient.getQueryData<CurrentView>(dashboardKeys.currentView);
      const previousSelectedView = queryClient.getQueryData<CurrentView>(dashboardKeys.selectedView);

      queryClient.setQueryData<TagValue[]>(tagsQueryKey, (currentTags = []) =>
        currentTags.map((tag) =>
          tag.id === updatedTag.id ? { ...tag, ...updatedTag } : tag
        )
      );

      const existingTag = previousTags?.find((tag) => tag.id === updatedTag.id);
      if (existingTag) {
        setTagInListsCache({ ...existingTag, ...updatedTag });
      }

      return { previousTags, previousLists, previousCurrentView, previousSelectedView };
    },
    onError(_error, _variables, context) {
      queryClient.setQueryData(tagsQueryKey, context?.previousTags);
      queryClient.setQueryData(queryKey, context?.previousLists);
      queryClient.setQueryData(dashboardKeys.currentView, context?.previousCurrentView);
      queryClient.setQueryData(dashboardKeys.selectedView, context?.previousSelectedView);
    },
  }));

  const deleteTagMutation = useMutation(trpc.tag.delete.mutationOptions({
    async onMutate(deletedTag) {
      await cancelTagCacheQueries();

      const previousTags = queryClient.getQueryData<TagValue[]>(tagsQueryKey);
      const previousLists = queryClient.getQueryData<CurrentView>(queryKey);
      const previousCurrentView = queryClient.getQueryData<CurrentView>(dashboardKeys.currentView);
      const previousSelectedView = queryClient.getQueryData<CurrentView>(dashboardKeys.selectedView);

      queryClient.setQueryData<TagValue[]>(tagsQueryKey, (currentTags = []) =>
        currentTags.filter((tag) => tag.id !== deletedTag.id)
      );
      queryClient.setQueryData<CurrentView>(dashboardKeys.allLists, (currentView) =>
        currentView
          ? {
            ...currentView,
            lists: currentView.lists.map((list) => ({
              ...list,
              listTags: list.listTags.filter((listTag) => listTag.tagId !== deletedTag.id),
            })),
          }
          : currentView
      );
      queryClient.setQueryData<CurrentView>(dashboardKeys.currentView, (currentView) =>
        currentView
          ? {
            ...currentView,
            lists: currentView.lists
              .map((list) => ({
                ...list,
                listTags: list.listTags.filter((listTag) => listTag.tagId !== deletedTag.id),
              }))
              .filter((list) => currentView.view.type !== "CUSTOM" ||
                currentView.view.viewTags.every((viewTag) =>
                  list.listTags.some((listTag) => listTag.tagId === viewTag.tagId)
                )),
          }
          : currentView
      );
      queryClient.setQueryData<CurrentView>(dashboardKeys.selectedView, (currentView) =>
        currentView
          ? {
            ...currentView,
            lists: currentView.lists
              .map((list) => ({
                ...list,
                listTags: list.listTags.filter((listTag) => listTag.tagId !== deletedTag.id),
              }))
              .filter((list) => currentView.view.type !== "CUSTOM" ||
                currentView.view.viewTags.every((viewTag) =>
                  list.listTags.some((listTag) => listTag.tagId === viewTag.tagId)
                )),
          }
          : currentView
      );

      return { previousTags, previousLists, previousCurrentView, previousSelectedView };
    },
    onError(_error, _variables, context) {
      queryClient.setQueryData(tagsQueryKey, context?.previousTags);
      queryClient.setQueryData(queryKey, context?.previousLists);
      queryClient.setQueryData(dashboardKeys.currentView, context?.previousCurrentView);
      queryClient.setQueryData(dashboardKeys.selectedView, context?.previousSelectedView);
    },
    async onSuccess(result) {
      reconcileAffectedViewLists(queryClient, dashboardKeys, result.affectedViews);
    },
  }));

  const toggleTag = (tag: TagValue) => {
    const isSelected = selectedTagIds.includes(tag.id);

    if (isSelected) {
      scheduleTagFlush(tag, "remove");
      return;
    }

    scheduleTagFlush(tag, "add");
  };

  const updateTagColor = (tagId: string, color: TagColor) => {
    updateTagMutation.mutate({ id: tagId, color });
  };

  const createTag = async () => {
    const name = search.trim();
    if (!name || exactTagExists) return;

    const id = crypto.randomUUID();
    setSearch("");
    setOpen(false);

    await createTagMutation.mutateAsync({
      id,
      name,
      color: "gray",
    });
    const createdTag = queryClient
      .getQueryData<TagValue[]>(tagsQueryKey)
      ?.find((tag) => tag.id === id);

    if (createdTag) {
      scheduleTagFlush(createdTag, "add");
    }
  };

  const deleteTag = (tagId: string) => {
    deleteTagMutation.mutate({ id: tagId });
  };

  const isCreatingNewTag = search.trim() && !exactTagExists;

  return (
    <div className="flex w-full flex-wrap items-center gap-1">
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            "h-5 max-w-full min-w-0 justify-start gap-1 rounded-full border px-1.5 text-[11px] hover:cursor-default",
            TAG_COLOR_CLASSES[tag.color]
          )}
        >
          <span className="min-w-0 truncate">{tag.name}</span>

          <button
            type="button"
            onClick={() => scheduleTagFlush(tag, "remove")}
            className="shrink-0 rounded-full opacity-70 transition hover:cursor-pointer hover:opacity-100"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Badge
            variant="outline"
            className="h-5 gap-1 rounded-full border px-1.5 text-[11px]"
          >
            <Tag className="size-2.5" />
            Tags
          </Badge>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="center"
          className="w-64 overflow-hidden p-0"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              value={search}
              onValueChange={setSearch}
              className="h-8 text-xs"
            />
            <CommandList className="overflow-y-hidden">
              <CommandEmpty className="px-2 py-2.5 text-xs text-muted-foreground text-start">
                No tags found.
              </CommandEmpty>

              {filteredTags.length > 0 && (
                <CommandGroup heading="Existing tags">
                  <ScrollArea
                    className={cn(
                      "max-h-36",
                      !isCreatingNewTag && "h-36"
                    )}
                  >
                    {filteredTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);

                      return (
                        <div
                          key={tag.id}
                          className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.25rem_1.25rem] items-center gap-1 px-1 py-0.5"
                        >
                          <CommandItem
                            value={tag.name}
                            onSelect={() => toggleTag(tag)}
                            className="h-7 min-w-0 cursor-pointer overflow-hidden rounded-sm px-1 text-xs [&>svg:last-child]:hidden"
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="block min-w-0 flex-1 truncate pl-1.5">
                                {tag.name}
                              </span>

                              <Check
                                className={cn(
                                  "size-3.5 shrink-0",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </div>
                          </CommandItem>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              deleteTag(tag.id);
                            }}
                            className={cn(
                              "text-muted-foreground transition",
                              "hover:bg-destructive/10 hover:text-destructive"
                            )}
                            aria-label={`Delete ${tag.name} tag`}
                          >
                            <Trash2 className="size-3" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <span
                                  className={cn(
                                    "flex size-3 items-center justify-center rounded-full border",
                                    TAG_COLOR_CLASSES[tag.color],
                                    "ring-1 ring-muted ring-offset-1"
                                  )}
                                />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="w-32 p-2 flex flex-col gap-0.5"
                              onCloseAutoFocus={(event) =>
                                event.preventDefault()
                              }
                            >
                              <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                                Choose color
                              </p>

                              <div className="grid grid-cols-4 gap-1">
                                {TAG_COLORS.map((color) => {
                                  const isCurrentColor = tag.color === color;

                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      title={color}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        updateTagColor(tag.id, color);
                                      }}
                                      className={cn(
                                        "flex size-5 items-center justify-center rounded-full border transition hover:scale-105",
                                        TAG_COLOR_CLASSES[color],
                                        isCurrentColor
                                      )}
                                    >
                                      {isCurrentColor && (
                                        <Check className="size-2.5" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </CommandGroup>
              )}

              {search.trim() && !exactTagExists && (
                <CommandGroup heading="Create new">
                  <CommandItem
                    value={search}
                    onSelect={createTag}
                    className="h-7 min-w-0 cursor-pointer gap-1 px-1.5 text-xs"
                  >
                    <Plus className="size-3 shrink-0" />
                    <span className="min-w-0 truncate">
                      Create &quot;{search.trim()}&quot;
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
