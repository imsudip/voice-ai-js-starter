'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { NextUIProvider } from "@nextui-org/react";
import ClientAnalytics from "./components/ClientAnalytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <NextUIProvider>
          {children}
          <ClientAnalytics />
        </NextUIProvider>
      </body>
    </html>
  );
}
