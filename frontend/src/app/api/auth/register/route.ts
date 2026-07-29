import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const apiUrl = process.env.API_URL;
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const isSecureRequest =
    forwardedProto === "https" || new URL(req.url).protocol === "https:";
  const secureCookies = isSecureRequest;

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

  let result: Response;
  try {
    result = await fetch(`${apiBase}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  if (!result.ok) {
    const err = await result.json().catch(() => ({}));
    return NextResponse.json(
      { success: false, ...err },
      { status: result.status },
    );
  }

  const data = await result.json();

  const res = NextResponse.json({
    success: true,
    user: data.user,
    stores: data.stores,
  });

  res.cookies.set("accessToken", data.accessToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  res.cookies.set("refreshToken", data.refreshToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return res;
}
