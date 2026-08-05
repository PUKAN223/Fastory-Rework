import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// In-memory store for POS state (Store ID -> POS State)
const storePosState: Record<string, any> = {};

async function getActiveStoreId() {
  const cookieStore = await cookies();
  return cookieStore.get("activeStoreId")?.value;
}

export async function GET() {
  const activeStoreId = await getActiveStoreId();

  if (!activeStoreId) {
    return NextResponse.json({ success: false, state: null }, { status: 400 });
  }

  const state = storePosState[activeStoreId] || null;

  return NextResponse.json({ success: true, state }, { status: 200 });
}

export async function POST(req: Request) {
  const activeStoreId = await getActiveStoreId();

  if (!activeStoreId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  
  storePosState[activeStoreId] = body;

  return NextResponse.json({ success: true }, { status: 200 });
}

