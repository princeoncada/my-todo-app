import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const appName = "Tidy";
const appDescription =
  "A lightweight personal todo workspace for fast lists, tags, and focused task planning.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: appName,
  title: {
    default: `${appName}`,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  keywords: [
    "todo app",
    "task manager",
    "personal productivity",
    "lists",
    "tagged todos",
  ],
  authors: [{ name: "Prince Oncada" }],
  creator: "Prince Oncada",
  publisher: "Prince Oncada",
  category: "productivity",
  openGraph: {
    type: "website",
    url: "/",
    siteName: appName,
    title: `${appName} - Personal Todo Lists`,
    description: appDescription,
    images: [
      {
        url: "/icon-clean.png",
        width: 512,
        height: 512,
        alt: `${appName} app icon`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} - Personal Todo Lists`,
    description: appDescription,
    images: ["/icon-clean.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-clean.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased font-extralight`}
    >
      <body className="min-h-full flex justify-center font-normal">
        <TRPCReactProvider>
          {children}
          <Toaster
            toastOptions={{
              classNames: {
                description: "!text-zinc-700"
              }
            }}
          />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
