import { notFound } from "next/navigation";
import { LabelsView } from "@/components/labels-view";
import { getProjectByKey } from "@/lib/projects";
import { listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();

  const tickets = listTickets({ project: project.key });
  return <LabelsView project={project} initialTickets={tickets} />;
}
