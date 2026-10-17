import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/projects";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const project = createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
