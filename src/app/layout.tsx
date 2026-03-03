import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASO Audit \u2014 App Store Optimization Analysis",
  description: "Comprehensive App Store Optimization audit for iOS and Android apps, powered by the ASO Stack framework.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#faf8f5" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
