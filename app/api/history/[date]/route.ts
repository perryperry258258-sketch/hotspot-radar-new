import { NextResponse } from "next/server";
import { getReport } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { date: string } }
) {
  const report = await getReport(params.date);
  if (!report) {
    return NextResponse.json({ error: "找不到這天的紀錄" }, { status: 404 });
  }
  return NextResponse.json(report);
}
