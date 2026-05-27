import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-surface-muted bg-surface-base">
      <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <Logo variant="light" size="md" />
        </Link>
        <nav aria-label="Principal" className="flex gap-4 text-sm font-medium">
          <Link
            href="/"
            className="text-ink-mid hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Buscar
          </Link>
        </nav>
      </div>
    </header>
  );
}
