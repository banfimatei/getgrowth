import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GetGrowth \u2014 App Growth Tools for Mobile Teams",
  description: "Free, expert-grade tools for app store optimization, keyword research, and mobile growth. Start with a full ASO audit for iOS and Android.",
  openGraph: {
    title: "GetGrowth \u2014 App Growth Tools",
    description: "Free ASO audit tool for iOS and Android apps. Analyze metadata, visuals, ratings, and conversion signals against best practices.",
    siteName: "GetGrowth",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#faf8f5" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x1F4C8;</text></svg>" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
