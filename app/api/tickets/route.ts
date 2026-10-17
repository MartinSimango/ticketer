import { NextRequest, NextResponse } from "next/server";
import { listTickets, createTicket } from "@/lib/tickets";
import type { Status } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tickets = listTickets({
    project: sp.get("project") ?? undefined,
    status: (sp.get("status") as Status | null) ?? undefined,
    label: sp.get("label") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ticket = createTicket(body);
    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
