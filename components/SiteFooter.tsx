import Link from "next/link";
import { NewsletterSignup } from "./NewsletterSignup";

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.22 8.22 0 0 0 4.8 1.54V6.76a4.85 4.85 0 0 1-1.03-.07z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-surface-muted bg-surface-card">
      <div className="mx-auto flex max-w-screen-lg flex-col items-center gap-5 px-4 py-8 sm:px-6 lg:px-8">

        {/* Redes sociais + CTA */}
        <nav
          aria-label="Redes sociais e contato"
          className="flex flex-wrap justify-center gap-x-6 gap-y-3"
        >
          <a
            href="https://www.instagram.com/ondebrincar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-mid transition-colors hover:text-brand-primary"
          >
            <InstagramIcon />
            Instagram
          </a>
          <a
            href="https://www.tiktok.com/@ondebrincarr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-mid transition-colors hover:text-brand-primary"
          >
            <TikTokIcon />
            TikTok
          </a>
          <a
            href="https://ig.me/m/ondebrincar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-ink-mid transition-colors hover:text-brand-primary"
          >
            Sugira uma atração
          </a>
        </nav>

        {/* Newsletter */}
        <div className="flex w-full flex-col items-center gap-2 border-t border-surface-muted pt-5">
          <p className="text-base font-normal text-ink">
            Receba novidades sobre Onde Brincar por e-mail
          </p>
          <NewsletterSignup />
        </div>

        {/* Links institucionais */}
        <nav
          aria-label="Links institucionais"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          <Link
            href="/sobre"
            className="text-sm text-ink-mid transition-colors hover:text-brand-primary"
          >
            Sobre
          </Link>
          <Link
            href="/privacidade"
            className="text-sm text-ink-mid transition-colors hover:text-brand-primary"
          >
            Privacidade
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-ink-soft">© 2026 Onde Brincar</p>
      </div>
    </footer>
  );
}
