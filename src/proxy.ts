import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const st = request.nextUrl.searchParams.get("_st");
  if (!st) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-aircampus-token", st);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const cookieName = process.env.SESSION_COOKIE_NAME || "aircampus_session";

  // Also attempt to persist cookie if browser permits it
  if (!request.cookies.get(cookieName)) {
    const proto = request.headers.get("x-forwarded-proto") || "";
    const isHttps =
      proto.split(",")[0].trim().toLowerCase() === "https" ||
      request.nextUrl.protocol === "https:";
    if (isHttps) {
      response.cookies.set(cookieName, st, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    } else {
      response.cookies.set(cookieName, st, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
