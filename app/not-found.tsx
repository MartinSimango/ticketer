import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-foreground">
          Not found
        </h1>
        <p className="mb-4 text-sm text-muted">
          This page doesn&apos;t exist, or the project may have been deleted.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
