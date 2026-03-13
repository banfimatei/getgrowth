import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/audit",          // free audit accessible without login
  "/pricing",
  "/compare",        // comparison tool also accessible without login
  "/api/search(.*)",
  "/api/audit((?!/deep-dive|/visualize|/export-pdf).*)", // basic audit is public; deep-dive/visualize/export are protected
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
