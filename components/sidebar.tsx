"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Inbox,
  Plus,
  Search,
  Tag,
  Trash2,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

export function Sidebar({
  projects,
}: {
  projects: Project[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeKey = React.useMemo(() => {
    const m = pathname.match(/^\/projects\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : undefined;
  }, [pathname]);
  const [newOpen, setNewOpen] = React.useState(false);
  const [key, setKey] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [toDelete, setToDelete] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, name }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create project");
      return;
    }
    const project: Project = await res.json();
    setNewOpen(false);
    setKey("");
    setName("");
    router.push(`/projects/${project.key}`);
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const scope = activeKey ? `&project=${activeKey}` : "";
    router.push(`/search?q=${encodeURIComponent(q)}${scope}`);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    await fetch(`/api/projects/${toDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    const wasActive = toDelete.key === activeKey;
    const remaining = projects.filter((p) => p.id !== toDelete.id);
    setToDelete(null);
    if (wasActive) {
      router.push(remaining.length ? `/projects/${remaining[0].key}` : "/projects");
    }
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <img
          src="/logo.svg"
          alt="Ticketer"
          className="h-9 w-9 rounded-xl"
          width={36}
          height={36}
        />
        <div>
          <h1 className="text-base font-semibold text-foreground">Ticketer</h1>
          <p className="text-xs text-muted">Kanban & tickets</p>
        </div>
      </div>

      <form onSubmit={submitSearch} className="px-3 pb-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets…"
            className="pl-8"
          />
        </div>
      </form>

      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Projects
        </span>
        <button
          onClick={() => setNewOpen(true)}
          aria-label="New project"
          className="rounded-lg p-1 text-brand-600 hover:bg-brand-50"
        >
          <Plus size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {projects.map((p) => {
          const boardHref = `/projects/${p.key}`;
          const backlogHref = `/projects/${p.key}/backlog`;
          const isActive = p.key === activeKey;
          return (
            <div key={p.id} className="group/project mb-1">
              <div
                className={cn(
                  "flex items-center rounded-lg pr-1",
                  isActive ? "bg-brand-50" : "hover:bg-brand-50"
                )}
              >
                <Link
                  href={boardHref}
                  className={cn(
                    "flex flex-1 items-center gap-2 px-2 py-1.5 text-sm font-medium",
                    isActive ? "text-brand-700" : "text-foreground"
                  )}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-100 text-xs font-semibold text-brand-700">
                    {p.key.slice(0, 2)}
                  </span>
                  {p.name}
                </Link>
                <button
                  onClick={() => setToDelete(p)}
                  aria-label={`Delete project ${p.name}`}
                  className="rounded p-1 text-muted opacity-0 transition-opacity hover:text-red-600 group-hover/project:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {isActive && (
                <div className="ml-8 mt-0.5 flex flex-col gap-0.5">
                  <SubLink
                    href={boardHref}
                    active={pathname === boardHref}
                    icon={<LayoutGrid size={14} />}
                    label="Board"
                  />
                  <SubLink
                    href={backlogHref}
                    active={pathname === backlogHref}
                    icon={<Inbox size={14} />}
                    label="Backlog"
                  />
                  <SubLink
                    href={`/projects/${p.key}/labels`}
                    active={pathname === `/projects/${p.key}/labels`}
                    icon={<Tag size={14} />}
                    label="Labels"
                  />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium",
            pathname === "/settings"
              ? "bg-brand-50 text-brand-700"
              : "text-foreground hover:bg-brand-50"
          )}
        >
          <SettingsIcon size={16} />
          Settings
        </Link>
      </div>

      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New project"
      >
        <form onSubmit={createProject} className="space-y-4">
          <div>
            <Label htmlFor="project-key">Key</Label>
            <Input
              id="project-key"
              value={key}
              autoFocus
              placeholder="e.g. WEB"
              onChange={(e) => setKey(e.target.value.toUpperCase())}
            />
            <p className="mt-1 text-xs text-muted">
              2-10 letters/numbers. Used as the ticket prefix (WEB-001).
            </p>
          </div>
          <div>
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              placeholder="e.g. Web App"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete project"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Delete <strong>{toDelete?.name}</strong> ({toDelete?.key})? This
            permanently removes the project and{" "}
            <strong>all of its tickets</strong>. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        </div>
      </Dialog>
    </aside>
  );
}

function SubLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
        active ? "text-brand-700" : "text-muted hover:text-brand-700"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
