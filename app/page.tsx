import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <MaxWidthWrapper singleItemPage={true}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Simple Todo App</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Organize your tasks with multiple lists, drag-and-drop reordering, and optimisic updates.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link
            href="/register"
            className={buttonVariants({
              class: "w-full",
              size: "lg"
            })}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              class: "w-full border border-zinc-200",
              variant: "outline",
              size: "lg"
            })}
          >
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </MaxWidthWrapper>
  );
}
