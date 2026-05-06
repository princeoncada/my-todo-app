"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CurrentView, OptimisticList } from "./types";
import { Plus } from "lucide-react";
import { invalidateViewPayloadQueries, queryKeysEqual, selectedViewFromCache } from "@/lib/dashboard-cache";
import { Skeleton } from "../ui/skeleton";


const ListAdder = () => {

  const [createListName, setCreateListName] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewsQueryKey = trpc.view.getAll.queryKey();
  const currentViewQueryKey = trpc.view.getCurrentViewListsWithItems.queryKey();
  const { data: views, isLoading: viewsLoading } = useQuery(trpc.view.getAll.queryOptions());
  const allListsView = views?.find((view) => view.type === "ALL_LISTS");
  const allListsQueryKey = allListsView
    ? trpc.view.getViewListsWithItems.queryKey({ viewId: allListsView.id })
    : currentViewQueryKey;
  const selectedView = selectedViewFromCache(views);
  const selectedViewId = selectedView?.id;
  const selectedViewQueryKey = selectedViewId
    ? trpc.view.getViewListsWithItems.queryKey({ viewId: selectedViewId })
    : currentViewQueryKey;
  const dashboardKeys = {
    views: viewsQueryKey,
    allLists: allListsQueryKey,
    currentView: currentViewQueryKey,
    selectedView: selectedViewQueryKey,
  };

  const { isLoading: bootListsLoading } = useQuery(
    trpc.view.getCurrentViewListsWithItems.queryOptions()
  );

  const { isLoading: allListsLoading } = useQuery(
    trpc.view.getViewListsWithItems.queryOptions(
      { viewId: allListsView?.id ?? "00000000-0000-0000-0000-000000000000" },
      { enabled: Boolean(allListsView?.id) }
    )
  );

  const { isLoading: selectedViewLoading } = useQuery(
    trpc.view.getViewListsWithItems.queryOptions(
      { viewId: selectedViewId ?? "00000000-0000-0000-0000-000000000000" },
      { enabled: Boolean(selectedViewId) }
    )
  );

  const { mutate: createList, isPending: createListPending } = useMutation(trpc.list.createList.mutationOptions({
    async onMutate(variables) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: dashboardKeys.allLists }),
        queryClient.cancelQueries({ queryKey: dashboardKeys.currentView }),
        queryClient.cancelQueries({ queryKey: dashboardKeys.selectedView }),
      ]);

      const previousAllLists = queryClient.getQueryData<CurrentView>(dashboardKeys.allLists);
      const previousCurrentView = queryClient.getQueryData<CurrentView>(dashboardKeys.currentView);
      const previousSelectedView = queryClient.getQueryData<CurrentView>(dashboardKeys.selectedView);

      if (!previousAllLists && !previousCurrentView) {
        return { previousAllLists, previousCurrentView, previousSelectedView };
      }

      const activeView = selectedViewFromCache(queryClient.getQueryData(viewsQueryKey));
      const selectedViewTags = activeView?.viewTags ?? [];
      const optimisticListTags = selectedViewTags.map((viewTag) => ({
        listId: variables.id,
        tagId: viewTag.tagId,
        tag: viewTag.tag,
      }));

      const optimisticList: OptimisticList = {
        id: variables.id,
        userId: "optimistic",
        name: variables.name,
        order: (previousCurrentView?.lists.length ?? previousAllLists?.lists.length ?? 0) > 0
          ? Math.min(...(previousCurrentView?.lists ?? previousAllLists?.lists ?? []).map((list) => list.order)) - 1
          : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        listTags: activeView?.type === "CUSTOM"
          ? optimisticListTags
          : [],
        listItems: [],
        isOptimistic: true
      };

      const insertOptimisticList = (current: CurrentView | undefined) =>
        current
          ? {
            ...current,
            lists: [
              optimisticList,
              ...current.lists,
            ],
          }
          : current;

      const insertIntoSelectedView = (current: CurrentView | undefined) =>
        current && (activeView?.type !== "CUSTOM" || activeView.id === current.view.id)
          ? {
            ...current,
            lists: [
              optimisticList,
              ...current.lists,
            ],
          }
          : current;

      queryClient.setQueryData<CurrentView>(dashboardKeys.allLists, insertOptimisticList);
      queryClient.setQueryData<CurrentView>(dashboardKeys.currentView, insertIntoSelectedView);
      if (
        !queryKeysEqual(dashboardKeys.selectedView, dashboardKeys.allLists) &&
        !queryKeysEqual(dashboardKeys.selectedView, dashboardKeys.currentView)
      ) {
        queryClient.setQueryData<CurrentView>(dashboardKeys.selectedView, insertIntoSelectedView);
      }

      return { previousAllLists, previousCurrentView, previousSelectedView };
    },
    async onSuccess(createdList, variables) {
      const replaceOptimisticList = (current: CurrentView | undefined) => {
        if (!current) return current;

        const matchingLists = current.lists.filter((list) => list.id === variables.id);
        if (matchingLists.length === 0) return current;

        const preservedList = matchingLists.reduce((bestList, list) =>
          list.listItems.length > bestList.listItems.length ? list : bestList
        );
        let insertedCreatedList = false;

        return {
          ...current,
          lists: current.lists.reduce<CurrentView["lists"]>((nextLists, list) => {
              if (list.id !== variables.id) {
                nextLists.push(list);
                return nextLists;
              }

              if (insertedCreatedList) {
                return nextLists;
              }

              insertedCreatedList = true;
              nextLists.push({
                ...createdList,
                order: list.order,
                // Items can be added while a new list is still saving. Keep them instead of wiping the local work.
                listItems: preservedList.listItems,
                listTags: preservedList.listTags,
              });
              return nextLists;
            }, []),
        };
      };

      queryClient.setQueryData<CurrentView>(dashboardKeys.allLists, replaceOptimisticList);
      queryClient.setQueryData<CurrentView>(dashboardKeys.currentView, replaceOptimisticList);
      if (
        !queryKeysEqual(dashboardKeys.selectedView, dashboardKeys.allLists) &&
        !queryKeysEqual(dashboardKeys.selectedView, dashboardKeys.currentView)
      ) {
        queryClient.setQueryData<CurrentView>(dashboardKeys.selectedView, replaceOptimisticList);
      }
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.views });
      await invalidateViewPayloadQueries(queryClient);
    },
    onError(_error, _variables, context) {
      queryClient.setQueryData(dashboardKeys.allLists, context?.previousAllLists);
      queryClient.setQueryData(dashboardKeys.currentView, context?.previousCurrentView);
      queryClient.setQueryData(dashboardKeys.selectedView, context?.previousSelectedView);
    },
  }));

  const handleCreateList = () => {
    const name = createListName.trim();

    if (!name || createListPending) return;

    createList({
      id: crypto.randomUUID(),
      name,
      viewId: selectedView?.id,
    });
    setCreateListName('');
  };

  const handleExit = () => {
    setTimeout(() => {
      setCreateListName('');
    }, 200);
  };

  if (
    viewsLoading ||
    !allListsView ||
    bootListsLoading ||
    allListsLoading ||
    selectedViewLoading
  ) {
    return (
      <div className="h-full flex items-end">
        <Skeleton className="hidden h-8 w-24 md:block" />
        <Skeleton className="size-9 md:hidden" />
      </div>
    );
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    >
      <DialogTrigger className="h-full" asChild>
        <div className="h-full flex items-end">
          <Button
            className="font-semibold hidden md:flex"
            variant="outline"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="-ml-1" />Add List
          </Button>
          <Button
            className="font-semibold md:hidden p-4"
            size="icon-lg"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={handleExit}
      >
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription>
            Give your new todo list a name
          </DialogDescription>
        </DialogHeader>
        <Separator className="-ml-10 w-[120%]!" />
        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input
              className="rounded-lg"
              type="text"
              placeholder="Enter your list name..."
              value={createListName}
              onChange={(e) => { setCreateListName(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateList();
                  setDialogOpen(false);
                }
              }}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" size="lg" variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            size="lg"
            onClick={() => {
              handleCreateList();
              setDialogOpen(false);
            }}
            disabled={createListName.trim().length === 0 || createListPending}
          >Create List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListAdder;
