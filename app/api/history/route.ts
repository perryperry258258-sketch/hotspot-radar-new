import { NextResponse } from "next/server";
import { listHistory } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const summaries = await listHistory();
  return NextResponse.json({ history: summaries });
}
