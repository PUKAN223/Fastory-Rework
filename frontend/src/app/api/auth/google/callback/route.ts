import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const errorParam = requestUrl.searchParams.get("error");

  if (errorParam || !code) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "error",
      errorParam || "Missing Google authorization code",
    );
    return NextResponse.redirect(loginUrl);
  }

  const apiUrl = process.env.API_URL || "http://localhost:8080";
  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  const apiBase = normalizedApiUrl.endsWith("/api/v1")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`;

  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const isSecureRequest =
    forwardedProto === "https" || requestUrl.protocol === "https:";

  const redirectUri = `${requestUrl.origin}/api/auth/google/callback`;

  try {
    const backendRes = await fetch(`${apiBase}/auth/google/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok || !data.accessToken || !data.refreshToken) {
      if (data.notRegistered) {
        const registerUrl = new URL("/register", req.url);
        registerUrl.searchParams.set("error", "account_not_found");
        if (data.email) registerUrl.searchParams.set("email", data.email);
        if (data.name) registerUrl.searchParams.set("name", data.name);
        if (data.googleId)
          registerUrl.searchParams.set("google_id", data.googleId);
        if (data.picture) registerUrl.searchParams.set("picture", data.picture);
        return NextResponse.redirect(registerUrl);
      }

      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set(
        "error",
        data.message || "Failed to authenticate with Google",
      );
      return NextResponse.redirect(loginUrl);
    }

    const redirectTarget = new URL("/stores", req.url);
    const res = NextResponse.redirect(redirectTarget);

    res.cookies.set("accessToken", data.accessToken, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });

    res.cookies.set("refreshToken", data.refreshToken, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 days
    });

    return res;
  } catch (err: any) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "error",
      err?.message || "Google authentication service unavailable",
    );
    return NextResponse.redirect(loginUrl);
  }
}
