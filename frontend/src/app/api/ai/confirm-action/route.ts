import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getApiBase() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return null;
  return apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;
}

async function getAccessToken() {
  return (await cookies()).get("accessToken")?.value;
}

async function getActiveStoreId() {
  return (await cookies()).get("activeStoreId")?.value;
}

export async function POST(req: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Missing access token" },
      { status: 401 }
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { success: false, message: "API_URL is not configured" },
      { status: 500 }
    );
  }

  const activeStoreId = await getActiveStoreId();
  if (!activeStoreId) {
    return NextResponse.json(
      { success: false, message: "No active store selected" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));

  try {
    const r = await fetch(`${apiBase}/stores/${activeStoreId}/ai/confirm-action`, {
      method: "POST",
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
      { success: false, message: "Cannot reach upstream API." },
      { status: 502 }
    );
  }
}
