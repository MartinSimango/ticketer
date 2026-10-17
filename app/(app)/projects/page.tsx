import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default function ProjectsIndexPage() {
  const projects = listProjects();
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-foreground">
          {projects.length ? "Pick a project" : "No projects yet"}
        </h1>
        <p className="text-sm text-muted">
          {projects.length
            ? "Choose a project from the sidebar to see its board."
            : "Create your first project with the + button in the sidebar."}
        </p>
      </div>
    </div>
  );
}
