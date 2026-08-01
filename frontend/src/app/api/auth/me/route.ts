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

export async function PATCH(req: Request) {
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiUrl = process.env.API_URL || "http://localhost:8080";
  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  const apiBase = normalizedApiUrl.endsWith("/api/v1")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`;

  const body = await req.json();

  try {
    const r = await fetch(`${apiBase}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Cannot reach backend API" },
      { status: 502 },
    );
  }
}

export async function DELETE(req: Request) {
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiUrl = process.env.API_URL || "http://localhost:8080";
  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  const apiBase = normalizedApiUrl.endsWith("/api/v1")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`;

  const body = await req.json().catch(() => ({}));

  try {
    const r = await fetch(`${apiBase}/users/me`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    const res = NextResponse.json(data, { status: r.status });

    if (r.ok) {
      res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
      res.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
    }

    return res;
  } catch {
    return NextResponse.json(
      { success: false, message: "Cannot reach backend API" },
      { status: 502 },
    );
  }
}
