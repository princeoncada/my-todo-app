

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button, buttonVariants } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import { CircleUser, Gem, User } from "lucide-react";

interface UserAccountNavProps {
  email: string | undefined;
  name: string;
  imageUrl?: string;
  logout: () => void;
}

const UserAccountNav = ({ email, imageUrl, name, logout }: UserAccountNavProps) => {

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="overflow-visible"
      >
        <Button className="rounded-full h-12 w-12 aspect-square bg-slate-400">
          <Avatar className='relative h-12 w-12'>
            {imageUrl ? (
              <div className="relative aspect-square h-full w-full">
                <AvatarImage src={imageUrl} alt={name} referrerPolicy="no-referrer" />
              </div>
            ) :
              <AvatarFallback>
                <User className="scale-130!" />
              </AvatarFallback>}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white w-40 p-1 m-1" align="start">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-0.5 leading-none min-w-0">
            {name && <p className="font-medium text-sm text-black">{name}</p>}
            {
              email && (
                <p className="truncate text-xs text-zinc-700">{email}</p>
              )
            }
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: "link"
            })}
          >Your Information</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <div className="p-4 flex">
            <Button size="lg" onClick={logout}>Logout</Button>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAccountNav;