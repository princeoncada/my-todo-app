"use client";

import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Loader2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const supabase = createClient();

const formSchema = z.object({
  password: z.string().nonempty("Please enter your password.").min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().nonempty("Please enter your confirm password.").min(8, "Password must be at least 8 characters.")
}).superRefine(({ confirmPassword, password }, ctx) => {
  if (confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "The passwords did not match.",
      path: ["confirmPassword"]
    });
  }
});

const Page = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
    mode: "onSubmit"
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: values.password
    });

    if (error) {
      toast.error(<span className="text-red-600">Something went wrong...</span>, {
        description: <span className="text-red-500">Please try again later</span>,
        icon: <Ban className="text-red-600 w-4 h-4" />,
        position: "top-center"
      });
      setLoading(false);
    } else {
      toast.success(<span className="text-green-700">Password updated!</span>, {
        description: <span>Redirecting you now...</span>,
        duration: 1000,
        position: "top-center"
      });

      setTimeout(() => {
        redirect("/dashboard");
      }, 1000);
    }
  };

  return (
    <MaxWidthWrapper singleItemPage={true}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Enter and confirm your new password below</CardDescription>
        </CardHeader>

        <CardContent>
          <form id="reset-password-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">
                      Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enter your password"
                    />
                    {
                      fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )
                    }
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="confirm-password"
                      type="password"
                      aria-invalid={fieldState.invalid}
                      placeholder="Re-enter your password"
                    />
                    {
                      fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )
                    }
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="w-full flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full hover:cursor-pointer"
              form="reset-password-form"
              disabled={loading}
            >
              {
                !loading ?
                  "Update password"
                  : (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )
              }
            </Button>
            <Link href="/login" className={buttonVariants({
              class: "w-full border-2 border-zinc-300!",
              size: "lg",
              variant: "outline"
            })}>Back to login</Link>
          </div>
        </CardFooter>
      </Card>
    </MaxWidthWrapper>
  );
};

export default Page;
