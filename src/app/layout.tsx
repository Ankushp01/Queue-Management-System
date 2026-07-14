import type { Metadata } from "next";

import "./globals.css";

import AppProvider from "@/providers/app-provider";

export const metadata: Metadata = {
    title: "QueueFlow",
    description: "Digital queue management",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AppProvider>
                    {children}
                </AppProvider>
            </body>
        </html>
    );
}