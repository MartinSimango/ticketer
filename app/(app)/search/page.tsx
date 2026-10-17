import Link from "next/link";
import { searchTickets } from "@/lib/tickets";
import { getProjectByKey } from "@/lib/projects";
import { PriorityBadge, TypeIcon, LabelChip } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; project?: string }>;
}) {
  const { q = "", project } = await searchParams;
  const scoped = project ? getProjectByKey(project) : undefined;
  const results = q ? searchTickets(q, { project: scoped?.key }) : [];

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">
          Search results
        </h1>
        <p className="text-xs text-muted">
          {q ? (
            <>
              {results.length} match{results.length === 1 ? "" : "es"} for “{q}”
              {scoped ? ` in ${scoped.name}` : " across all projects"}
            </>
          ) : (
            "Enter a query in the sidebar."
          )}
        </p>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-2">
          {results.map((t) => (
            <Link
              key={t.id}
              href={
                t.status === "backlog"
                  ? `/projects/${t.id.split("-")[0]}/backlog`
                  : `/projects/${t.id.split("-")[0]}`
              }
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm hover:border-brand-200 hover:shadow-md"
            >
              <TypeIcon type={t.type} />
              <span className="w-20 shrink-0 text-xs font-medium text-brand-600">
                {t.id}
              </span>
              <span className="flex-1 truncate text-sm font-medium text-foreground">
                {t.title}
              </span>
              {t.labels.map((l) => (
                <LabelChip key={l} label={l} />
              ))}
              <PriorityBadge priority={t.priority} />
            </Link>
          ))}
          {q && results.length === 0 && (
            <p className="py-16 text-center text-sm text-muted">
              No tickets matched your search.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
