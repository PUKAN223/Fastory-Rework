import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const apiUrl = process.env.API_URL || "http://localhost:8080";
  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  const apiBase = normalizedApiUrl.endsWith("/api/v1")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`;

  try {
    const res = await fetch(`${apiBase}/auth/google/url`, {
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.url) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set(
        "error",
        data.message || "Google auth configuration error",
      );
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(data.url);
  } catch (err: any) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "Cannot connect to auth server");
    return NextResponse.redirect(loginUrl);
  }
}
