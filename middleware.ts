import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DASHBOARD_PATH = "/dashboard";
const NO_STORE_HEADER = "no-store, no-cache, must-revalidate";

const withNoStore = () => {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", NO_STORE_HEADER);
  return response;
};

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isAuthRoute = pathname === "/api/auth" || pathname.startsWith("/api/auth/");
  const isPublicRoute = pathname === "/api/public" || pathname.startsWith("/api/public/");
  const isShareLinkByToken = pathname.startsWith("/api/v2/share-links/by-token/");
  const isLoginRoute = pathname === "/login" || pathname === "/signup";
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (!isApiRoute) {
    if (isLoginRoute) {
      const callbackUrl = searchParams.get("callbackUrl");
      if (callbackUrl !== DASHBOARD_PATH) {
        const url = request.nextUrl.clone();
        url.searchParams.set("callbackUrl", DASHBOARD_PATH);
        return NextResponse.redirect(url);
      }
      return withNoStore();
    }

    if (isDashboardRoute) {
      return withNoStore();
    }

    return NextResponse.next();
  }

  if (isAuthRoute || isPublicRoute || isShareLinkByToken) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.brandId || !token?.role) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "unauthorized",
          message: "Not authenticated",
        },
      },
      { status: 401 },
    );
  }

  const headers = new Headers(request.headers);
  headers.set("x-brand-id", String(token.brandId));

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ["/api/:path*", "/dashboard", "/dashboard/:path*", "/login", "/signup"],
};
