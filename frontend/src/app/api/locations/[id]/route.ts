import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getApiBase() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

  return apiUrl.endsWith("/api/v1") ? apiUrl : `${apiUrl}/api/v1`;
}

async function getAccessToken() {
  return (await cookies()).get("accessToken")?.value;
}

async function getActiveStoreId() {
  const cookieStore = await cookies();
  return cookieStore.get("activeStoreId")?.value;
}

function makeUrl(apiBase: string, storeId: string, id: string) {
  return `${apiBase}/stores/${storeId}/locations/${encodeURIComponent(id)}`;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const activeStoreId = await getActiveStoreId();
  if (!activeStoreId) {
    return NextResponse.json(
      { message: "No active store selected" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const response = await fetch(makeUrl(apiBase, activeStoreId, id), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const activeStoreId = await getActiveStoreId();
  if (!activeStoreId) {
    return NextResponse.json(
      { message: "No active store selected" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const response = await fetch(makeUrl(apiBase, activeStoreId, id), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing access token" },
      { status: 401 },
    );
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json(
      { message: "API_URL is not configured" },
      { status: 500 },
    );
  }

  const activeStoreId = await getActiveStoreId();
  if (!activeStoreId) {
    return NextResponse.json(
      { message: "No active store selected" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const response = await fetch(makeUrl(apiBase, activeStoreId, id), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
