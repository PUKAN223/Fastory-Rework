import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getApiBase() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return null;
  const normalized = apiUrl.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("accessToken")?.value;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { success: false, message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const { id } = await context.params;

  let r: Response;
  try {
    r = await fetch(`${apiBase}/stores/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Cannot reach upstream API." },
      { status: 502 },
    );
  }

  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { success: false, message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const body = await req.json();

  let r: Response;
  try {
    r = await fetch(`${apiBase}/stores/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Cannot reach upstream API." },
      { status: 502 },
    );
  }

  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { success: false, message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  let r: Response;
  try {
    r = await fetch(`${apiBase}/stores/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Cannot reach upstream API." },
      { status: 502 },
    );
  }

  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
