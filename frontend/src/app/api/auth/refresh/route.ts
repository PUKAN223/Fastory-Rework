import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const refreshToken = (await cookies()).get("refreshToken")?.value;
  if (!refreshToken) {
    const res = NextResponse.json({ success: false }, { status: 401 });
    res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    res.cookies.set("activeStoreId", "", { path: "/", maxAge: 0 });
    return res;
  }
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

  let r: Response;
  try {
    r = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
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
    const res = NextResponse.json({ success: false }, { status: 401 });
    res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
    res.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
    res.cookies.set("activeStoreId", "", { path: "/", maxAge: 0 });
    return res;
  }

  const data = await r.json(); // { accessToken, refreshToken? }

  const res = NextResponse.json({ success: true });

  res.cookies.set("accessToken", data.accessToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  // ถ้า backend หมุน refresh token (rotation) ก็ set rt ใหม่ด้วย
  if (data.refreshToken) {
    res.cookies.set("refreshToken", data.refreshToken, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }

  return res;
}
