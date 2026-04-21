"use client";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { redirect } from "next/navigation";
import MaxWidthWrapper from "./MaxWidthWrapper";
import { Loader2 } from "lucide-react";

const supabase = createClient();

const UserDetails = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSignOut() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setCurrentUser(null)
    redirect("/")
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loggingOut) {
    return <MaxWidthWrapper>
      <Loader2 className="w-5 h-5 animate-spin"/>
    </MaxWidthWrapper>
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          User Details
        </CardTitle>
        <CardDescription>
          Someone currently <span className={"font-medium text-red-500"}>{currentUser == null ? "not " : ""}</span>logged in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <p>
            <span className="font-medium">Email: </span>{currentUser === null ? "john@doe.com" : currentUser?.email}
          </p>
          <p>
            <span className="font-medium">ID: </span>{currentUser === null ? "1234-4321-4352-5433" : currentUser?.id}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button size="lg" className="hover:cursor-pointer" onClick={handleSignOut}>
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserDetails;