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

export async function GET() {
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

  const response = await fetch(`${apiBase}/images/`, {
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

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => ({}));
  const response = await fetch(`${apiBase}/images/`, {
    method: "POST",
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
