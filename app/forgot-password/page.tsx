"use client";

import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { absoluteUrl } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const supabase = createClient();

const formSchema = z.object({
  email: z.email("Please enter a valid email address.")
});

const Page = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    },
    mode: "onSubmit"
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: absoluteUrl("/auth/confirm?next=/reset-password")
    });

    if (error) {
      toast.error(<span className="text-red-600">Something went wrong...</span>, {
        description: <span className="text-red-500">Please try again later</span>,
        icon: <Ban className="text-red-600 w-4 h-4" />,
        position: "top-center"
      });
    } else {
      toast.success(<span className="text-green-700">Reset email sent!</span>, {
        description: <span>If an account exists for that email, we sent a reset link.</span>,
        position: "top-center"
      });
      form.reset();
    }

    setLoading(false);
  };

  return (
    <MaxWidthWrapper singleItemPage={true}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
        </CardHeader>

        <CardContent>
          <form id="forgot-password-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">
                      Email
                    </FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="john@doe.com"
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
              form="forgot-password-form"
              disabled={loading}
            >
              {
                !loading ?
                  "Send reset link"
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
