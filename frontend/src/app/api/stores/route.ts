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

export async function GET() {
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

  let r: Response;
  try {
    r = await fetch(`${apiBase}/stores`, {
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

export async function POST(req: Request) {
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

  const body = await req.json();

  let r: Response;
  try {
    r = await fetch(`${apiBase}/stores`, {
      method: "POST",
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
