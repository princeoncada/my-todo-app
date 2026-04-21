"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import * as z from "zod";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from "@/lib/supabase/client";
import { toast, useSonner } from "sonner";
import { redirect } from "next/navigation";
import { useState } from "react";
import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Loader2, X } from "lucide-react";

const supabase = createClient();

const formSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string()
});

const Page = () => {
  const { toasts } = useSonner();
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: ''
    },
    mode: "onSubmit"
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    toasts.forEach((t) => toast.dismiss(t.id));

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password
    });

    if (error) {
      if (error.code == "invalid_credentials") {
        toast.error("Invalid credentials.", {
          description: <>Please check your <span className="text-red-500 font-semibold">email</span> and <span className="text-red-500 font-semibold">password</span>.</>,
          position: "top-center",
          icon: <X className="text-red-500 w-5 h-5" />
        });
      } else {
        toast.error("Something went wrong...", {
          description: "Please try again later.",
          position: "top-center"
        });
      }

      console.log(error.code);
      setLoading(false);
    } else {
      toast.success(<span className="text-green-700">Login Successful!</span>, {
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
    <MaxWidthWrapper>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to receive an OTP</CardDescription>
        </CardHeader>

        <CardContent>
          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
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
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="w-full flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full hover:cursor-pointer"
              form="login-form"
              disabled={loading}
            >
              {
                !loading ?
                  "Login"
                  : (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )
              }
            </Button>
            <Link href={`/`} className={buttonVariants({
              class: "w-full border-2 border-zinc-300!",
              size: "lg",
              variant: "outline"
            })}>Back</Link>
          </div>

          <Link
            href="/register"
            className={buttonVariants({
              variant: "link"
            })}
          >
            Don&apos;t have an account yet?
          </Link>
        </CardFooter>
      </Card>
    </MaxWidthWrapper>
  );
};

export default Page;