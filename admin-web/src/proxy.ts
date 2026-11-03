import { NextResponse } from "next/server";
import { deniedHtml, previewAllowed } from "../security.mjs";
export function proxy() {
  if (!previewAllowed(process.env.NODE_ENV, process.env.ADMIN_MOCK_MODE)) {
    return new NextResponse(deniedHtml, {
      status: 403,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*"] };
