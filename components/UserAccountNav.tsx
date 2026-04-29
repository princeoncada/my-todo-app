

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";



const UserAccountNav = ({ logout }: { logout: () => void; }) => {

  const trpc = useTRPC();
  const { data } = useQuery(trpc.getUser.queryOptions());
  const user = data?.user;
  const name = user ? "lol" : "angas";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="overflow-visible"
      >
        <Button className="rounded-full h-7 w-7 md:h-9 md:w-9 bg-slate-400">
          <Avatar className='relative h-7 w-7 md:h-9 md:w-9'>
            <AvatarFallback>
              <User className="scale-90 md:scale-100" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white w-40 p-1 m-1" align="start">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-0.5 leading-none min-w-0">
            {name && <p className="font-medium text-xs text-black">{name}</p>}
            {
              user && (
                <p className="truncate text-xs text-zinc-700">{user.email}</p>
              )
            }
          </div>
        </div>

        {/* <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <div>
            <Button
              className="w-full"
              variant="link"
              disabled
            >
              Placeholder
            </Button>
          </div>
        </DropdownMenuItem> */}

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={logout} className="text-xs">
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAccountNav;