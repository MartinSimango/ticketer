import { notFound } from "next/navigation";
import { Board } from "@/components/board";
import { getProjectByKey } from "@/lib/projects";
import { listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();

  const tickets = listTickets({ project: project.key });
  return <Board project={project} initialTickets={tickets} />;
}
