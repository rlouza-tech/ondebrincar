import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-primary/10 bg-white">
      <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Onde Brincar
        </Link>
        <nav aria-label="Principal" className="flex gap-4 text-sm font-medium">
          <Link
            href="/buscar"
            className="text-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Buscar
          </Link>
        </nav>
      </div>
    </header>
  );
}
