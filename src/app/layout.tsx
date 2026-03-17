import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GetGrowth — Know which ASO changes grow your installs",
  description: "AI-powered ASO audit that connects to App Store Connect and Google Play, turns findings into experiments, and tracks impact automatically. Start free.",
  openGraph: {
    title: "GetGrowth — ASO Experiment OS for Mobile Apps",
    description: "Run an AI ASO audit, connect your store data, and track which title, screenshot, and keyword experiments actually move installs.",
    siteName: "GetGrowth",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" className={`${bodyFont.variable} ${monoFont.variable}`}>
        <head>
          <meta name="color-scheme" content="light" />
          <meta name="theme-color" content="#F8FAFC" />
          <link
            rel="icon"
            href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x1F4C8;</text></svg>"
          />
        </head>
        <body className="antialiased min-h-screen">
          <NavBar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
