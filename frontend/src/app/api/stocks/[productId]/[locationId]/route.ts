import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getApiBase() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  return normalizedApiUrl.endsWith("/api/v1")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api/v1`;
}

async function getAccessToken() {
  return (await cookies()).get("accessToken")?.value;
}

function buildStockUrl(apiBase: string, productId: string, locationId: string) {
  return `${apiBase}/stocks/${encodeURIComponent(productId)}/${encodeURIComponent(locationId)}`;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ productId: string; locationId: string }> },
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

  const { productId, locationId } = await context.params;

  try {
    const response = await fetch(
      buildStockUrl(apiBase, productId, locationId),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message: "Cannot reach upstream API. Check API_URL and tunnel status.",
      },
      { status: 502 },
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ productId: string; locationId: string }> },
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

  const { productId, locationId } = await context.params;
  const body = await req.json().catch(() => ({}));

  try {
    const response = await fetch(
      buildStockUrl(apiBase, productId, locationId),
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message: "Cannot reach upstream API. Check API_URL and tunnel status.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ productId: string; locationId: string }> },
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

  const { productId, locationId } = await context.params;

  try {
    const response = await fetch(
      buildStockUrl(apiBase, productId, locationId),
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message: "Cannot reach upstream API. Check API_URL and tunnel status.",
      },
      { status: 502 },
    );
  }
}
