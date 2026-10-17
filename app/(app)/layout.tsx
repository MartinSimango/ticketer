import { Sidebar } from "@/components/sidebar";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = listProjects();
  return (
    <div className="flex">
      <Sidebar projects={projects} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
