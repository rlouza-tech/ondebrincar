import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const UTM_REDIRECTS: Record<string, string> = {
  "/condo": "/?utm_source=whatsapp&utm_medium=social&utm_campaign=condominiofit",
  "/escola": "/?utm_source=whatsapp&utm_medium=social&utm_campaign=escola",
};

export function middleware(request: NextRequest) {
  const destination = UTM_REDIRECTS[request.nextUrl.pathname];

  if (destination) {
    const url = request.nextUrl.clone();
    const [pathname, search] = destination.split("?");
    url.pathname = pathname;
    url.search = search ?? "";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/condo", "/escola"],
};
