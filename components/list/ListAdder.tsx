"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { List } from "./types";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/auth-js";

const supabase = createClient();

const ListAdder = () => {

  const [createListName, setCreateListName] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser();
  }, []);


  const trpc = useTRPC();
  const queryClient = useQueryClient();

  async function getUser() {
    const currUser = await supabase.auth.getUser();
    setUser(currUser.data.user);
  }

  const { mutate: createList } = useMutation(trpc.createList.mutationOptions({
    async onMutate(variables) {
      const queryKey = trpc.getListsWithItems.queryKey();

      await queryClient.cancelQueries({ queryKey });

      const previousLists = queryClient.getQueryData<List[]>(queryKey);

      if (!previousLists) return { previousLists };

      const optimisticList: List = {
        id: variables.id,
        userId: user ? user.id : "",
        name: variables.name,
        order: previousLists && previousLists.length > 0
          ? Math.max(...previousLists.map((list) => list.order)) + 1
          : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        listItems: []
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
        <Button
          className="h-full px-5 font-semibold"
          variant="outline"
          size="lg"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          New List +
        </Button>
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