import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'; // 🚨 1. Add this import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AI Interview Simulator",
    description: "Practice technical and behavioral interviews with AI.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // 🚨 2. Wrap the HTML tag with ClerkProvider
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                <body className={`${inter.className} bg-slate-50 min-h-screen text-slate-900`}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    );
}