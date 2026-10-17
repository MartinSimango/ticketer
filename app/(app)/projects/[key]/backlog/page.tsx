import { notFound } from "next/navigation";
import { Backlog } from "@/components/backlog";
import { getProjectByKey } from "@/lib/projects";
import { listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();

  const tickets = listTickets({ project: project.key });
  return <Backlog project={project} initialTickets={tickets} />;
}
