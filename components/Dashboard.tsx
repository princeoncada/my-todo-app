"use client";

import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/auth-js";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import ListsContainer from "./list/ListsContainer";
import UserAccountNav from "./UserAccountNav";
import ListAdder from "./list/ListAdder";
import { Separator } from "./ui/separator";
import { redirect } from "next/navigation";

const supabase = createClient();

const Dashboard = () => {

  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    const currUser = await supabase.auth.getUser();
    setUser(currUser.data.user);
  }

  function handleLogout() {
    setLoggingOut(true);
    supabase.auth.signOut();
    redirect('/');
  }

  if (loggingOut) {
    return <MaxWidthWrapper singleItemPage={true}>
      <Loader2 className="w-5 h-5 animate-spin" />;
    </MaxWidthWrapper>;
  }

  return (
    <MaxWidthWrapper>
      <div className="flex relative">
        <div className="flex-1 flex flex-col gap-3 py-10">
          <div className="flex flex-col gap-2.5 w-full items-center">
            <div className="w-full flex flex-col">
              <div className="w-full flex justify-between items-end h-12">
                <div className="flex gap-3">
                  <UserAccountNav email={user?.email} name={user?.user_metadata.name} logout={handleLogout} />
                  <h1 className="text-3xl md:text-[40px] font-bold text-gray-900">
                    Your Todo Lists
                  </h1>
                </div>
                <ListAdder />
              </div>
            </div>
            <Separator className="bg-zinc-200/30" />
          </div>
          <ListsContainer />
        </div>
      </div>
    </MaxWidthWrapper>
  );
};

export default Dashboard;