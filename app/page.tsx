import { redirect } from "next/navigation";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default function Home() {
  const projects = listProjects();
  if (projects.length > 0) {
    redirect(`/projects/${projects[0].key}`);
  }
  redirect("/projects");
}
