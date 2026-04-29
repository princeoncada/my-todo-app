"use client";

import { createClient } from "@/lib/supabase/client";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

const supabase = createClient();

const UserDetails = () => {
  const [loggingOut, setLoggingOut] = useState(false);

  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.user.getUser.queryOptions());
  const user = data;

  async function handleSignOut() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    redirect("/");
  }

  if (loggingOut) {
    return <Loader2 className="w-5 h-5 animate-spin" />;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          User Details
        </CardTitle>
        <CardDescription>
          {
            isLoading ?
              <Skeleton className="h-4 w-1/2" /> :
              <>Someone currently <span className={"font-medium text-red-500"}>{user == null ? "not " : ""}</span>logged in.</>
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <div>
            {
              isLoading ?
                <Skeleton className="h-4 w-2/3" /> :
                <><span className="font-medium">Email: </span>{user === null ? "john@doe.com" : user?.email}</>
            }
          </div>
          <div>
            {
              isLoading ?
                <Skeleton className="h-4 w-3/4" /> :
                <><span className="font-medium">ID: </span>{user === null ? "1234-4321-4352-5433" : user?.id}</>
            }
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button size="lg" className="hover:cursor-pointer" onClick={handleSignOut}>
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserDetails;