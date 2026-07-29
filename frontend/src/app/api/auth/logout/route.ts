import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;
  const apiUrl = process.env.API_URL;
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const isSecureRequest =
    forwardedProto === "https" || new URL(req.url).protocol === "https:";
  const secureCookies = isSecureRequest;

  if (apiUrl && (accessToken || refreshToken)) {
    const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
    const apiBase = normalizedApiUrl.endsWith("/api/v1")
      ? normalizedApiUrl
      : `${normalizedApiUrl}/api/v1`;

    await fetch(`${apiBase}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        ...(refreshToken ? { refreshToken } : {}),
      }),
    }).catch(() => null);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("accessToken", "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
