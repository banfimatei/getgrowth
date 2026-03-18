import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/audit",
  "/pricing",
  "/compare",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/search(.*)",
  "/api/audit((?!/deep-dive|/visualize|/export-pdf).*)",
  "/api/audit/activate",
  "/api/stripe/guest-checkout",
  "/api/stripe/ping",
  "/api/compare(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
