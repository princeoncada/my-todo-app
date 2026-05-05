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
import { selectedViewFromCache, syncProjectedCurrentView } from "@/lib/dashboard-cache";


const ListAdder = () => {

  const [createListName, setCreateListName] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewsQueryKey = trpc.view.getAll.queryKey();
  const currentViewQueryKey = trpc.view.getCurrentViewListsWithItems.queryKey();
  const queryKey = currentViewQueryKey;
  const dashboardKeys = {
    views: viewsQueryKey,
    allLists: queryKey,
    currentView: currentViewQueryKey,
  };

  const { data: views } = useQuery(trpc.view.getAll.queryOptions());
  const selectedView = selectedViewFromCache(views);

  const { mutate: createList, isPending: createListPending } = useMutation(trpc.list.createList.mutationOptions({
    async onMutate(variables) {
      await queryClient.cancelQueries({ queryKey });

      const previousCurrentView = queryClient.getQueryData<CurrentView>(queryKey);

      if (!previousCurrentView) return { previousCurrentView };

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
        order: previousCurrentView.lists.length > 0
          ? Math.min(...previousCurrentView.lists.map((list) => list.order)) - 1
          : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        listTags: activeView?.type === "CUSTOM"
          ? optimisticListTags
          : [],
        listItems: [],
        isOptimistic: true
      };

      queryClient.setQueryData<CurrentView>(queryKey, (current) =>
        current
          ? {
            ...current,
            lists: [
              optimisticList,
              ...current.lists,
            ],
          }
          : current
      );
      syncProjectedCurrentView(queryClient, dashboardKeys);

      return { previousCurrentView };
    },
    onSuccess(createdList, variables) {
      queryClient.setQueryData<CurrentView>(queryKey, (current) =>
        current
          ? {
            ...current,
            lists: current.lists.map((list) =>
              list.id === variables.id
                ? {
                  ...createdList,
                  order: list.order,
                  // Items can be added while a new list is still saving. Keep them instead of wiping the local work.
                  listItems: list.listItems,
                  listTags: list.listTags,
                }
                : list
            ),
          }
          : current
      );
      syncProjectedCurrentView(queryClient, dashboardKeys);
    },
    onError(_error, _variables, context) {
      if (context?.previousCurrentView) {
        queryClient.setQueryData(queryKey, context.previousCurrentView);
      }
      syncProjectedCurrentView(queryClient, dashboardKeys);
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
