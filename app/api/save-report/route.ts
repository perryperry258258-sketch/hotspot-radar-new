import { NextResponse } from "next/server";
import { saveReport } from "@/lib/storage";
import { HotspotReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const report = body?.report as HotspotReport;

    if (!report || !report.date || !Array.isArray(report.topics)) {
      return NextResponse.json(
        { error: "報告格式不正確" },
        { status: 400 }
      );
    }

    await saveReport(report);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "儲存失敗" },
      { status: 500 }
    );
  }
}
