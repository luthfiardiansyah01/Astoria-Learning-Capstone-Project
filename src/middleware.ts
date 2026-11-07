import { NextResponse, type NextRequest } from "next/server";
import { exceedsBodyLimit } from "@/lib/body-limit";

export function middleware(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return NextResponse.next();

  if (exceedsBodyLimit(req.nextUrl.pathname, req.headers.get("content-length"))) {
    return NextResponse.json(
      {
        error: "Ukuran permintaan terlalu besar.",
        code: "payload_too_large",
      },
      { status: 413 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
