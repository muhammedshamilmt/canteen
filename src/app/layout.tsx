import AppProviders from "@/components/providers/AppProviders";
import React, { Suspense } from "react";
import "./globals.css";
import Loading from "./loading";

export const metadata = {
  title: 'Canteen Tracker App', // Your website title
  description: 'Track canteen attendance and manage meals easily.', // Your website description
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>
          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
        </AppProviders>
      </body>
    </html>
  );
} 