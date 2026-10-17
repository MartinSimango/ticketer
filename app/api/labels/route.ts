import { NextRequest, NextResponse } from "next/server";
import { listLabels } from "@/lib/tickets";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project") ?? undefined;
  return NextResponse.json(listLabels(project));
}
