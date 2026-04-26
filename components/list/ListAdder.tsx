"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { List, OptimisticList } from "./types";
import { Plus } from "lucide-react";


const ListAdder = () => {

  const [createListName, setCreateListName] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutate: createList } = useMutation(trpc.createList.mutationOptions({
    async onMutate(variables) {
      const queryKey = trpc.getListsWithItems.queryKey();

      await queryClient.cancelQueries({ queryKey });

      const previousLists = queryClient.getQueryData<List[]>(queryKey);

      if (!previousLists) return { previousLists };

      const optimisticList: OptimisticList = {
        id: variables.id,
        userId: "optimistic",
        name: variables.name,
        order: previousLists && previousLists.length > 0
          ? Math.max(...previousLists.map((list) => list.order)) + 1
          : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        listItems: [],
        isOptimistic: true
      };

      queryClient.setQueryData(queryKey, (old = []) => ([
        optimisticList,
        ...old
      ]));

      return { previousLists };
    },
    onError(_error, _variables, context) {
      if (context?.previousLists) {
        queryClient.setQueryData(
          trpc.getListsWithItems.queryKey(),
          context?.previousLists
        );
      }
    }
  }));

  const handleCreateList = () => {
    createList({
      id: crypto.randomUUID(),
      name: createListName.trim()
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
            className="h-full px-5 font-semibold hidden md:flex"
            variant="outline"
            size="lg"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="-ml-1"/>New List 
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
                console.log(e.key);
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
            disabled={createListName.length === 0}
          >Create List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListAdder;