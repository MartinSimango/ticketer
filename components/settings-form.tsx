"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Settings } from "@/lib/settings";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [port, setPort] = React.useState(String(initial.port));
  const [dbPath, setDbPath] = React.useState(initial.dbPath);
  const [status, setStatus] = React.useState<
    { kind: "idle" | "saved" | "error"; message?: string }
  >({ kind: "idle" });
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus({ kind: "idle" });
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ port: Number(port), dbPath }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus({ kind: "error", message: data.error ?? "Failed to save" });
      return;
    }
    const saved: Settings = await res.json();
    setPort(String(saved.port));
    setDbPath(saved.dbPath);
    setStatus({ kind: "saved" });
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">Settings</h1>
        <p className="text-xs text-muted">App configuration</p>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <form onSubmit={save} className="mx-auto max-w-lg space-y-5">
          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              min={1024}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Port the app runs on (default 5164). Restart the app or Mac app for a
              port change to take effect.
            </p>
          </div>

          <div>
            <Label htmlFor="dbPath">Database file</Label>
            <Input
              id="dbPath"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              Absolute path to the SQLite database. Changing this points Ticketer
              at a different set of tickets after restart.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {status.kind === "saved" && (
              <span className="text-sm text-emerald-600">
                Saved. Restart to apply.
              </span>
            )}
            {status.kind === "error" && (
              <span className="text-sm text-red-600">{status.message}</span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
