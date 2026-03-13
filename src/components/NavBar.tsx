"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "Product" },
  { href: "/#who-its-for", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "Resources" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLanding = pathname === "/";

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ backgroundColor: "rgba(250, 248, 245, 0.88)", borderColor: "var(--border)" }}
    >
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-sm shrink-0"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            G
          </span>
          <span className="hidden sm:inline">GetGrowth</span>
        </Link>

        {/* Desktop nav — max 4 links per brand spec */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/pricing" ? pathname === "/pricing" : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors hover:text-[var(--text-primary)]"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--accent-bg)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          {isSignedIn && (
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors hover:text-[var(--text-primary)]"
              style={{
                color: pathname === "/dashboard" ? "var(--accent)" : "var(--text-secondary)",
                backgroundColor: pathname === "/dashboard" ? "var(--accent-bg)" : "transparent",
              }}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side: auth + CTA */}
        <div className="flex items-center gap-2.5">
          {!isLoaded ? null : isSignedIn ? (
            <>
              <button
                onClick={() => router.push("/audit")}
                className="hidden md:block text-[13px] px-4 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                Run audit
              </button>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button
                  className="hidden md:block text-[13px] px-3 py-1.5 rounded-md font-medium transition-opacity hover:opacity-80"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sign in
                </button>
              </SignInButton>
              <button
                onClick={() => router.push("/audit")}
                className="text-[13px] px-4 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--accent)", color: "#fff" }}
              >
                {isLanding ? "Run your first audit" : "Run audit"}
              </button>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {mobileOpen ? (
                <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M2 4.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 13.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-5 pb-4 pt-2"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-page)" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn && (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Dashboard
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
