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
  const cookieStore = await cookies();
  return cookieStore.get("activeStoreId")?.value;
}

export async function GET() {
  const accessToken = await getAccessToken();
  const activeStoreId = await getActiveStoreId();
  const apiBase = getApiBase();

  if (!accessToken || !activeStoreId || !apiBase) {
    return NextResponse.json({ success: false, state: null }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiBase}/stores/${activeStoreId}/sales/pos-sync`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ success: false, state: null }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const accessToken = await getAccessToken();
  const activeStoreId = await getActiveStoreId();
  const apiBase = getApiBase();

  if (!accessToken || !activeStoreId || !apiBase) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const response = await fetch(`${apiBase}/stores/${activeStoreId}/sales/pos-sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
