import { type NextRequest, NextResponse } from "next/server";
import { REPORTS_UPSTREAM_URL } from "@/utils/reports/constants";

const NGROK_HEADERS = {
  "ngrok-skip-browser-warning": "true",
  Accept: "application/json",
};

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyRequest(request: NextRequest, { params }: RouteContext) {
  const resolved = await params;
  const segments = resolved?.path;
  const pathStr = Array.isArray(segments) ? segments.join("/") : segments ?? "";
  const incoming = new URL(request.url);
  const target = `${REPORTS_UPSTREAM_URL.replace(/\/$/, "")}/${pathStr}${incoming.search}`;

  const headers = new Headers(NGROK_HEADERS);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (error) {
    console.error("[reports-proxy] upstream fetch failed:", target, error);
    return NextResponse.json(
      { success: false, message: "Reports service unreachable. Check REPORTS_UPSTREAM_URL and restart the dev server." },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  const disposition = upstream.headers.get("Content-Disposition");
  const upstreamType = upstream.headers.get("Content-Type");
  if (disposition) outHeaders.set("Content-Disposition", disposition);
  if (upstreamType) outHeaders.set("Content-Type", upstreamType);

  if (upstreamType?.includes("application/json")) {
    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload, { status: upstream.status, headers: outHeaders });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, { status: upstream.status, headers: outHeaders });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
