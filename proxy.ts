import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const step = req.nextUrl.searchParams.get("step");
  const isAuthPage =
    pathname.startsWith("/login") ||
    (pathname.startsWith("/register") && step !== "business");
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/availability") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/marketing") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/settings");

  if (isDashboard && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPage && req.auth) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)",
  ],
};
