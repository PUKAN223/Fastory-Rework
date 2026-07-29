import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { success: false, message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  const apiBase = normalizedApiUrl.endsWith("/api/v1")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`;

  let r: Response;
  try {
    r = await fetch(`${apiBase}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Cannot reach upstream API. Check API_URL and tunnel status.",
      },
      { status: 502 },
    );
  }

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const res = NextResponse.json(
      { success: false, ...err },
      { status: r.status },
    );
    if (r.status === 401) {
      res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    }
    return res;
  }

  const body = await r.json();
  return NextResponse.json({
    success: true,
    user: body.user,
    stores: body.stores,
  });
}
