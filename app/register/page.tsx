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
import { toast } from "sonner";
import { useState } from "react";
import { Ban } from "lucide-react";

const supabase = createClient();

const formSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().nonempty("Please enter your password.").min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().nonempty("Please enter your confirm password.").min(8, "Password must be at least 8 characters.")
}).superRefine(({ confirmPassword, password }, ctx) => {
  if (confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "The passwords did not match.",
      path: ['confirmPassword']
    });
  }
});

const Page = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    mode: "onSubmit"
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/confirm?next=/dashboard"
      }
    });

    if (error) {
      toast.error(<span className="text-red-600">Something went wrong...</span>, {
        description: <span className="text-red-500">Please try again later</span>,
        icon: <Ban className="text-red-600 w-4 h-4"/>,
        position: "top-center"
      });
    } else {
      toast.success(<span className="text-green-700">Email sent successfully!</span>, {
        description: <span>Please check your email for the final step.</span>,
        position: "top-center"
      });
      form.reset();
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your email and choose a password below</CardDescription>
      </CardHeader>

      <CardContent>
        <form id="register-form" onSubmit={form.handleSubmit(onSubmit)}>
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
            form="register-form"
          >Register</Button>
          <Link href={`/`} className={buttonVariants({
            class: "w-full border-2 border-zinc-300!",
            size: "lg",
            variant: "outline"
          })}>Back</Link>
        </div>

        <Link
          href="/login"
          className={buttonVariants({
            variant: "link"
          })}
        >
          Already have an account?
        </Link>
      </CardFooter>
    </Card>
  );
};

export default Page;