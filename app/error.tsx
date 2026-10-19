"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mb-4 text-sm text-muted">
          An unexpected error occurred. You can try again.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
